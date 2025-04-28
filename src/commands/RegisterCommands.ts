import * as vscode from 'vscode';
import path from 'path';
import { DatabaseTreeProvider } from '../tree/DatabaseTreeProvider';
import { TableItem } from '../tree/TableItem';
import { TableViewPanel } from '../view/TableViewPanel';
import { DatabaseItem } from '../tree/DatabaseItem';
import { ConnectionManager } from '../database/ConnectionManager';
import { ConnectionFormPanel } from '../view/ConnectionFormPanel';
import { DriverFactory } from '../database/DriverFactory';
import { QueryRunnerPanel } from '../view/query/QueryRunnerPanel';

export function RegisterCommands(context: vscode.ExtensionContext, treeProvider: DatabaseTreeProvider) {
    let uri = context.extensionUri;

    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.connectDatabase', async () => {
            const uri = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: {
                    'SQLite': ['db', 'sqlite'],
                    'All Files': ['*']
                }
            });

            if (!uri || uri.length === 0) return;

            const filePath = uri[0].fsPath;
            const dbName = path.basename(filePath);

            const connectionManager = ConnectionManager.getInstance();
            // const connectionManager = treeProvider.connect(filePath);
            connectionManager.registerConnection({
                name: dbName,
                path: filePath,
                type: 'sqlite'
            });

            treeProvider.refresh();
        }),
        vscode.commands.registerCommand('simple-db.deleteDatabase', async (databaseItem: DatabaseItem) => {
            const confirm = await vscode.window.showWarningMessage(`Remover conexão com ${databaseItem.label}?`, 'Sim', 'Cancelar');

            if (confirm === 'Sim') {
                await DriverFactory.disconnect(databaseItem.label); // fecha driver corretamente
                ConnectionManager.getInstance().removeConnection(databaseItem.label);
                treeProvider.refresh();
            }
        }),
        vscode.commands.registerCommand('simple-db.refreshDatabase', async (databaseItem: DatabaseItem) => {
            await treeProvider.refresh();
        }),

        vscode.commands.registerCommand('simple-db.openTable', async (tableItem: TableItem) => {
            if (tableItem) {
                await fillColumns(tableItem);
                TableViewPanel.render(uri, tableItem);
            }
        }),

        vscode.commands.registerCommand('simple-db.openNewTable', async (tableItem: TableItem) => {
            if (tableItem) {
                await fillColumns(tableItem);
                TableViewPanel.renderNew(uri, tableItem);
            }
        })
    );

    // Não testado ainda
    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.newConnection', () => {
            ConnectionFormPanel.render(context.extensionUri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.saveConnection', (config: any) => {
            // const dbName = config.name;
            const manager = ConnectionManager.getInstance();
            manager.registerConnection(config);
            treeProvider.refresh();
        })
    );

    // Executa query no banco de dados
    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.executeQuery', async (item: any) => {
            if (!item) {
                vscode.window.showWarningMessage('Selecione um banco de dados para executar a query.');
                return;
            }

            const dbName = item.label; // Assumindo que o item é um DatabaseItem e label é o nome
            if (!dbName) {
                vscode.window.showWarningMessage('Nome do banco não encontrado.');
                return;
            }

            QueryRunnerPanel.render(context.extensionUri, dbName);
        })
    );



    async function fillColumns(tableItem: TableItem) {
        // Caso as colunas não estejam carregadas, chama o método getChildren para carregá-las
        // Isso pode ser necessário se o usuário clicar na tabela antes de expandi-la
        if (!tableItem.columns || tableItem.columns.length === 0) {
            await treeProvider.getChildren(tableItem);
        }
    }
}
