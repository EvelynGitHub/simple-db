import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ConnectionFormPanel {
    public static currentPanel: ConnectionFormPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.webview.html = this._getHtml();

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'saveConnection':
                        vscode.commands.executeCommand('simple-db.saveConnection', message.payload);
                        this.dispose();
                        break;
                    case 'cancel':
                        this.dispose();
                        break;
                    case 'testConnection':
                        vscode.commands.executeCommand('simple-db.testConnection', message.payload);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static render(extensionUri: vscode.Uri) {
        if (ConnectionFormPanel.currentPanel) {
            ConnectionFormPanel.currentPanel._panel.reveal();
        } else {
            const panel = vscode.window.createWebviewPanel(
                'connectionForm',
                'Nova Conexão',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
                }
            );

            ConnectionFormPanel.currentPanel = new ConnectionFormPanel(panel, extensionUri);
        }
    }

    private _getHtml(): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'connectionForm.html');
        let html = fs.readFileSync(htmlPath, 'utf8');
        return html;
    }

    public dispose() {
        ConnectionFormPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
