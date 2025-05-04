import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DriverFactory } from '../../database/DriverFactory';

export class ConnectionFormPanel {
    public static currentPanel: ConnectionFormPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.webview.html = this._getHtml();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(this._handleWebviewMessage.bind(this), null, this._disposables);
    }

    public static render(extensionUri: vscode.Uri) {
        if (ConnectionFormPanel.currentPanel) {
            ConnectionFormPanel.currentPanel._panel.reveal();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'connectionForm',
            'Nova Conexão',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            }
        );

        ConnectionFormPanel.currentPanel = new ConnectionFormPanel(panel, extensionUri);

    }

    private _getHtml(): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'src/view/connection', 'connectionForm.html');
        let html = fs.readFileSync(htmlPath, 'utf8');
        return html;
    }

    private async _handleWebviewMessage(message: any) {
        switch (message.type) {
            case 'pickFile':
                const fileUri = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    openLabel: 'Selecionar Banco SQLite',
                    filters: { 'SQLite': ['db', 'sqlite'], 'All Files': ['*'] }
                });

                if (fileUri && fileUri.length > 0) {
                    this._panel.webview.postMessage({ type: 'fileSelected', path: fileUri[0].fsPath });
                }
                break;
            case 'saveConnection':
                vscode.window.showInformationMessage('Conexão salva com sucesso.');
                vscode.commands.executeCommand('simple-db.saveConnection', message.config)
                this._panel.dispose();
                break;

            case 'testConnection':
                const testConfig = message.config;
                try {
                    await DriverFactory.create(testConfig, testConfig.name || 'teste');
                    DriverFactory.disconnect(testConfig.name || 'teste');
                    vscode.window.showInformationMessage('Conexão bem-sucedida!');
                } catch (error: any) {
                    vscode.window.showErrorMessage('Erro ao testar conexão: ' + error.message);
                }
                break;

            case 'cancel':
                this._panel.dispose();
                break;

            case 'error':
                vscode.window.showErrorMessage(message.message);
                break;
        }

    }

    public dispose() {
        ConnectionFormPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
