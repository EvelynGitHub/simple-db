// src/views/TableViewPanel.ts
import * as vscode from 'vscode';
import { ConnectionManager } from '../database/ConnectionManager';
import * as path from 'path';
import * as fs from 'fs';
import { TableItem } from '../tree/TableItem';
import { DriverFactory } from '../database/DriverFactory';

export class TableViewPanel {

	public static currentPanel: TableViewPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _table: TableItem;

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, table: TableItem) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._table = table;

		// Quando o painel for fechado, chama dispose
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Atualiza o HTML do painel
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
		this._sendForHtmlWebview(); // Envia os dados para o HTML
		this._setWebviewMessageListener(this._panel.webview); // Escuta as mensagens do HTML
	}

	public static renderNew(extensionUri: vscode.Uri, table: TableItem) {
		const panel = vscode.window.createWebviewPanel(
			'tableView',
			'Nova Tabela - ' + table.tableName,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media/public')],
				retainContextWhenHidden: true, // <-- Mantém o estado ao esconder
			}
		);

		TableViewPanel.currentPanel = new TableViewPanel(panel, extensionUri, table);
	}

	public static render(extensionUri: vscode.Uri, table: TableItem) {
		// Verifica se o painel ainda existe
		if (TableViewPanel.currentPanel && TableViewPanel.currentPanel._panel.visible) {
			TableViewPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);

			// Atualiza o título do painel
			TableViewPanel.currentPanel._panel.title = `${table.dbName} - ${table.tableName}`;
			TableViewPanel.currentPanel._table = table;

			// Atualiza os dados do HTML
			TableViewPanel.currentPanel._sendForHtmlWebview();
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'tableView',
			'Visualizar Tabela - ' + table.tableName + ' - ' + table.dbName,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media/public')],
				retainContextWhenHidden: true, // <-- Mantém o estado ao esconder
			}
		);

		TableViewPanel.currentPanel = new TableViewPanel(panel, extensionUri, table);

	}


	private _getHtmlForWebview(webview: vscode.Webview): string {
		const mediaPath = vscode.Uri.joinPath(this._extensionUri, 'media/public');

		const htmlPath = path.join(this._extensionUri.fsPath, 'media/public', 'index.html');
		let htmlContent = fs.readFileSync(htmlPath, 'utf8');

		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'script.js'));


		htmlContent = htmlContent
			.replace('./style.css', styleUri.toString())
			.replace('./script.js', scriptUri.toString());

		return htmlContent;
	}

	private async _setWebviewMessageListener(webview: vscode.Webview) {

		console.log('TableViewPanel.ts - Iniciando listener de mensagens: ', this._table);

		const connectionManager = ConnectionManager.getInstance().getConnection(this._table.dbName);
		if (!connectionManager) return;

		const driver = await DriverFactory.create(connectionManager);
		// const tables = await driver.getTables();

		webview.onDidReceiveMessage(
			async (message) => {
				try {
					console.log('Mensagem recebida do webview HTML: ', message);

					switch (message.type) {
						case 'insert':
							await driver.insertRow(this._table.tableName, message.data);
							vscode.window.showInformationMessage('Inserido novo registro');
							this._sendForHtmlWebview();
							break;
						case 'update':
							await driver.updateRow(this._table.tableName, message.primaryKey, message.primaryKeyValue, message.data);
							vscode.window.showInformationMessage('Atualizar registros selecionados');
							this._sendForHtmlWebview();
							break;
						case 'delete':
							console.log('Deletar registro', message.primaryKey, message.primaryKeyValue);

							await driver.deleteRow(this._table.tableName, message.primaryKey, message.primaryKeyValue);
							console.log("Depois do await");
							vscode.window.showInformationMessage('Deletar registros selecionados');
							this._sendForHtmlWebview();
							break;
						case 'refresh':
							this._sendForHtmlWebview();
							vscode.window.showInformationMessage('Recarregar dados da tabela');
							break;
						case 'search':
							this._sendForHtmlWebview(message.value, message.column);
							vscode.window.showInformationMessage(`Buscar por: ${message.value} na coluna ${message.column}`);
							break;
					}
				} catch (error: any) {
					vscode.window.showErrorMessage('Erro: ' + error.message);
				}
			},
			undefined,
			this._disposables
		);
	}

	public dispose() {
		console.log('Destruindo painel de tabela');

		TableViewPanel.currentPanel = undefined;
		// this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	private async _sendForHtmlWebview(searchText?: string, column?: string) {
		const connectionManager = ConnectionManager.getInstance().getConnection(this._table.dbName);
		const driver = await DriverFactory.create(connectionManager);
		const rows = await driver.getAllRows(this._table.tableName, searchText, column);

		const columns = this._table.columns;

		console.log('Enviando dados para o HTML COLUNAS', this._table);

		this._panel.webview.postMessage({
			type: 'renderTable',
			payload: {
				data: rows,
				columns
			},
		})
	}

}