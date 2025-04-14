import * as vscode from 'vscode';
import { DatabaseTreeProvider } from '../tree/DatabaseTreeProvider';
import { TableItem } from '../tree/TableItem';
import { TableViewPanel } from '../view/TableViewPanel';

export function RegisterCommands(context: vscode.ExtensionContext, treeProvider: DatabaseTreeProvider) {

    context.subscriptions.push(
        vscode.commands.registerCommand('simple-db.connectDatabase', async () => {
            const uri = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: {
                    'SQLite Databases': ['db', 'sqlite'],
                    'All Files': ['*']
                }
            });

            if (uri && uri[0]) {
                await treeProvider.connect(uri[0].fsPath);
            }
        }),

        vscode.commands.registerCommand('simple-db.openTable', async (tableItem: TableItem) => {
            console.log("nome da tabela: ", tableItem.tableName);
            if (tableItem) {
                await TableViewPanel.showTable(tableItem.dbName, tableItem.tableName);
            }
        })
    );
}
