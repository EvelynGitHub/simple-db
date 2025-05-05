// src/views/query/QueryRunnerPanel.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { QueryRunner } from '../../database/QueryRunner';
import { ConnectionManager } from '../../database/ConnectionManager';
import { DriverFactory } from '../../database/DriverFactory';
import { ExtensionConfig } from '../../utils/Config';

export class QueryRunnerPanel {
    public static currentPanel: QueryRunnerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _dbName: string;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, dbName: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._dbName = dbName;

        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        this._panel.onDidDispose(() => this.dispose())
        this._setWebviewMessageListener(this._panel.webview);
    }

    public static async render(extensionUri: vscode.Uri, dbName: string) {
        if (QueryRunnerPanel.currentPanel) {
            const confirm = await vscode.window.showWarningMessage(`Já existe um Query Runner aberto: ${QueryRunnerPanel.currentPanel._panel.title}.\n Deseja fecha-lo?`, 'Sim', 'Cancelar')

            if (confirm !== 'Sim') {
                QueryRunnerPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
                return
            }

            QueryRunnerPanel.currentPanel._panel.dispose()
        }

        const panel = vscode.window.createWebviewPanel(
            'queryRunner',
            `Executar Query - ${dbName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            }
        );

        QueryRunnerPanel.currentPanel = new QueryRunnerPanel(panel, extensionUri, dbName);

        if (ExtensionConfig.get().autoComplete) {
            const connectionManager = ConnectionManager.getInstance().getConnection(dbName);
            const driver = await DriverFactory.create(connectionManager, dbName);
            const tables = await driver.getTables()

            const columnsByTable: Record<string, string[]> = {};

            for (const table of tables) {
                const columns = await driver.getColumns(table);
                columnsByTable[table] = columns.map(col => col.columnName);
            }

            // Envia para a WebView
            panel.webview.postMessage({
                type: 'dbMetadata',
                payload: {
                    tables,
                    columnsByTable
                }
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {

        const htmlPath = path.join(this._extensionUri.fsPath, 'src/view/query', 'queryRunner.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // const mediaPath = vscode.Uri.joinPath(this._extensionUri, 'media');
        // const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'queryRunner.js'));
        // const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'style.css'));

        // htmlContent = htmlContent
        // .replace('./queryRunner.js', scriptUri.toString())
        // .replace('./style.css', styleUri.toString());

        return htmlContent;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'runQuery') {
                const query = message.query;
                const { success, result } = await QueryRunner.runQuery(this._dbName, query);

                this._panel.webview.postMessage({
                    type: 'queryResult',
                    payload: {
                        success,
                        result
                    }
                });
            }
        }, undefined, this._disposables);
    }

    public dispose() {
        QueryRunnerPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
