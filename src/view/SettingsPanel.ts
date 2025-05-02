import * as vscode from 'vscode';
import { ExtensionConfig } from '../utils/Config';

export class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;

        this._panel.webview.html = this._getHtml();
        this._panel.webview.onDidReceiveMessage(async message => {
            if (message.type === 'saveSettings') {
                try {
                    await ExtensionConfig.updateAll(message.settings);
                    vscode.window.showInformationMessage('Configurações salvas com sucesso!');
                } catch (error: any) {
                    console.log(error)
                    vscode.window.showErrorMessage('Erro ao salvar configurações: ' + error.message);
                }
                // break;
                // await ExtensionConfig.update(message.settings);
                // vscode.window.showInformationMessage('Configurações salvas! Atualize para aplicar.');
            }
        });
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const panel = vscode.window.createWebviewPanel(
            'simpleDbSettings',
            'SimpleDB - Configurações',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        SettingsPanel.currentPanel = new SettingsPanel(panel);
    }

    private _getHtml() {
        const config = ExtensionConfig.get();

        return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Configurações</title>
        <style>
          body { font-family: sans-serif; padding: 1em; }
          label { display: block; margin-top: 1em; }
        </style>
      </head>
      <body>
        <h2>Configurações da Extensão</h2>

        <label>
          Registros por página:
          <input id="pageSize" type="number" value="${config.pageSize}" min="1" />
        </label>

        <label>
          <input id="autoSave" type="checkbox" ${config.autoSave ? 'checked' : ''} />
          Salvar alterações automaticamente
        </label>

        <label>
          <input id="autoComplete" type="checkbox" ${config.autoComplete ? 'checked' : ''} />
          Auto completar nomes de campos
        </label>

        <button id="saveBtn">Salvar</button>

        <script>
          const vscode = acquireVsCodeApi();
          document.getElementById('saveBtn').onclick = () => {
            const settings = {
              pageSize: parseInt(document.getElementById('pageSize').value),
              autoSave: document.getElementById('autoSave').checked,
              autoComplete: document.getElementById('autoComplete').checked,
            };
            vscode.postMessage({ type: 'saveSettings', settings });
          };
        </script>
      </body>
      </html>
    `;
    }
}
