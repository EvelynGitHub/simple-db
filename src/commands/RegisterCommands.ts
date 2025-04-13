import * as vscode from 'vscode';
import { DatabaseTreeProvider } from '../tree/DatabaseTreeProvider';

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
        })
    );
}
