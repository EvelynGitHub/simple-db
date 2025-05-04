import * as vscode from 'vscode';
import path from 'path';
import { DatabaseTreeProvider } from '../tree/DatabaseTreeProvider';
import { TableItem } from '../tree/TableItem';
import { TableViewPanel } from '../view/table/TableViewPanel';
import { DatabaseItem } from '../tree/DatabaseItem';
import { ConnectionConfig, ConnectionManager } from '../database/ConnectionManager';
import { ConnectionFormPanel } from '../view/connection/ConnectionFormPanel';
import { DriverFactory } from '../database/DriverFactory';
import { QueryRunnerPanel } from '../view/query/QueryRunnerPanel';
import { SettingsPanel } from '../view/settings/SettingsPanel';

export function RegisterCommands(context: vscode.ExtensionContext, treeProvider: DatabaseTreeProvider) {
    let uri = context.extensionUri;

    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.refreshDatabases', () => treeProvider.refresh()),
        vscode.commands.registerCommand('simple-db.deleteDatabase', async (databaseItem: DatabaseItem) => {
            const confirm = await vscode.window.showWarningMessage(`Remover conexão com ${databaseItem.label}?`, 'Sim', 'Cancelar');

            if (confirm === 'Sim') {
                await DriverFactory.disconnect(databaseItem.label); // fecha driver corretamente
                ConnectionManager.getInstance().removeConnection(databaseItem.label);
                treeProvider.refresh();
            }
        }),
        vscode.commands.registerCommand('simple-db.refreshDatabase', async (item: DatabaseItem) => {
            if (!item) {
                vscode.window.showWarningMessage('Nenhuma conexão selecionada.');
                return;
            }

            const dbName = item.label;

            try {
                const connectionManager = ConnectionManager.getInstance();
                const config = connectionManager.getConnection(dbName);

                if (!config) {
                    vscode.window.showErrorMessage(`Conexão ${dbName} não encontrada.`);
                    return;
                }

                // Força reconexão
                await DriverFactory.disconnect(dbName);
                await DriverFactory.create(config, dbName);

                // Se deu certo:
                vscode.window.showInformationMessage(`Banco de dados ${dbName} reconectado com sucesso!`);
                treeProvider.refresh(item); // <-- Atualiza a árvore (vou explicar melhor embaixo)
            } catch (error: any) {
                console.error('Erro ao reconectar:', error);

                const choice = await vscode.window.showErrorMessage(
                    `Erro ao conectar no banco ${dbName}. Deseja remover essa conexão?`,
                    'Sim', 'Não'
                );

                if (choice === 'Sim') {
                    const connectionManager = ConnectionManager.getInstance();
                    await connectionManager.removeConnection(dbName);

                    // Fecha a Webview se ela estiver aberta para esse banco
                    TableViewPanel.closeIfConnectedTo(dbName);

                    treeProvider.refresh();
                }
            }
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

    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.settingsSimpleDb', () => {
            SettingsPanel.createOrShow(context.extensionUri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.addDatabase', () => {
            ConnectionFormPanel.render(context.extensionUri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.saveConnection', (config: ConnectionConfig) => {
            // const dbName = config.name;
            const manager = ConnectionManager.getInstance();
            if (config.type === 'sqlite') {
                config.name = path.basename(config.path as string);
            }
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
