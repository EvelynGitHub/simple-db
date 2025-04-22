import * as vscode from 'vscode';
import { DatabaseTreeProvider } from '../tree/DatabaseTreeProvider';
import { TableItem } from '../tree/TableItem';
import { TableViewPanel } from '../view/TableViewPanel';
import { DatabaseItem } from '../tree/DatabaseItem';

export function RegisterCommands(context: vscode.ExtensionContext, treeProvider: DatabaseTreeProvider) {
    let uri = context.extensionUri;


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
        vscode.commands.registerCommand('simple-db.deleteDatabase', async (databaseItem: DatabaseItem) => {
            await treeProvider.deleteDatabase(databaseItem.filePath);
        }),
        vscode.commands.registerCommand('simple-db.refreshDatabase', async (databaseItem: DatabaseItem) => {
            await treeProvider.refresh();
        }),

        vscode.commands.registerCommand('simple-db.openTable', async (tableItem: TableItem) => {
            if (tableItem) {
                //await TableViewPanel.showTable(tableItem.dbName, tableItem.tableName);
                await TableViewPanel.render(uri, tableItem.dbName, tableItem.tableName);
            }
        })
    );
}
