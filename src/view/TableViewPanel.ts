// src/views/TableViewPanel.ts
import * as vscode from 'vscode';
import { ConnectionManager } from '../database/ConnectionManager';
import * as path from 'path';
import * as fs from 'fs';
import { TableItem } from '../tree/TableItem';
import { DriverFactory } from '../database/DriverFactory';
import { IDatabaseDriver } from '../database/drivers/IDatabaseDriver';

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
		webview.onDidReceiveMessage(
			async (message) => {
				try {
					const connectionManager = ConnectionManager.getInstance();
					const connection = connectionManager.getConnection(this._table.dbName);

					if (!connection) {
						vscode.window.showWarningMessage(`Conexão perdida com o banco ${this._table.dbName}. Fechando painel.`);
						this._panel.dispose(); // Fecha o Webview para não deixar a tela travada
						return;
					}

					// Usa o driver já cacheado corretamente
					const driver = await DriverFactory.create(connection, this._table.dbName);
					// console.log("\t(TableViewPanel.ts -> webview.onDidReceiveMessage): ", message.data, this._table);
					// console.log('Mensagem recebida do webview HTML: ', message);

					switch (message.type) {
						case 'insert':
							await driver.insertRow(this._table.tableName, message.data);
							vscode.window.showInformationMessage('Inserido novo registro');
							this._sendForHtmlWebview();
							break;
						case 'update':
							// await driver.updateRow(this._table.tableName, message.primaryKey, message.primaryKeyValue, message.data);
							await driver.updateRow(this._table.tableName, message.data, message.originalKeys);
							vscode.window.showInformationMessage('Atualizar registros selecionados');
							this._sendForHtmlWebview();
							break;
						case 'delete':
							await driver.deleteRow(this._table.tableName, message.primaryKey, message.primaryKeyValue);
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
						case 'saveAll':
							this.saveDataAll(driver, message.insert, message.update);
							this._sendForHtmlWebview();
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
		TableViewPanel.currentPanel = undefined;
		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	private async _sendForHtmlWebview(searchText?: string, column?: string) {
		const connectionManager = ConnectionManager.getInstance().getConnection(this._table.dbName);
		const driver = await DriverFactory.create(connectionManager, this._table.dbName);
		const rows = await driver.getAllRows(this._table.tableName, searchText, column);

		const columns = this._table.columns;

		this._panel.webview.postMessage({
			type: 'renderTable',
			payload: {
				data: rows,
				columns
			},
		})
	}

	public static closeIfConnectedTo(dbName: string) {
		if (TableViewPanel.currentPanel && TableViewPanel.currentPanel._table.dbName === dbName) {
			TableViewPanel.currentPanel.dispose();
		}
	}

	public async saveDataAll(driver: IDatabaseDriver, inserts: [], updates: []) {
		try {

			await driver.insertRow(this._table.tableName, inserts);

			if (updates.length > 50) {
				const confirm = await vscode.window.showWarningMessage(`Tem certeza que deseja atualizar ${updates.length} linhas?`, 'Sim', 'Cancelar');

				if (confirm !== 'Sim') {
					return;
				}
			}

			await driver.updateRows(this._table.tableName, updates);

			vscode.window.showInformationMessage(`Dados salvos com sucesso.`);
		} catch (error) {
			console.error(error);
			vscode.window.showErrorMessage("Um erro inesperado aconteceu.");
		}
	}
}