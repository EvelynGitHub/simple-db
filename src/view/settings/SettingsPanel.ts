import * as vscode from 'vscode';
import { ExtensionConfig } from '../../utils/Config';
import path from 'path';
import * as fs from 'fs';

export class SettingsPanel {
	public static currentPanel: SettingsPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.webview.html = this._getHtml();
		this._panel.webview.onDidReceiveMessage(this._listenMessage.bind(this));
		this._sendToHtml();
	}

	public static createOrShow(extensionUri: vscode.Uri) {
		const panel = vscode.window.createWebviewPanel(
			'simpleDbSettings',
			'SimpleDB - Configurações',
			vscode.ViewColumn.One,
			{
				enableScripts: true, retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
			}
		);

		SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
	}

	private _getHtml() {
		const htmlPath = path.join(this._extensionUri.fsPath, 'media/settings', 'settings.html');
		let htmlContent = fs.readFileSync(htmlPath, 'utf8');

		// const mediaPath = vscode.Uri.joinPath(this._extensionUri, 'media');
		// const img = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'logo.png'));

		return htmlContent
		// .replace("{{img1}}", img.toString());
	}

	private _sendToHtml() {
		const config = ExtensionConfig.get();
		const send = {
			type: 'initializeSettings',
			payload: config
		}
		this._panel.webview.postMessage(send)
	}

	private async _listenMessage(message: any) {
		if (message.type === 'saveSettings') {
			try {
				await ExtensionConfig.updateAll(message.settings);
				vscode.window.showInformationMessage('Configurações salvas com sucesso!');
			} catch (error: any) {
				console.log(error)
				vscode.window.showErrorMessage('Erro ao salvar configurações: ' + error.message);
			}
		}
	}
}
