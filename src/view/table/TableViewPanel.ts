// src/views/TableViewPanel.ts
import * as vscode from 'vscode';
import { ConnectionManager } from '../../database/ConnectionManager';
import * as path from 'path';
import * as fs from 'fs';
import { TableItem } from '../../tree/TableItem';
import { DriverFactory } from '../../database/DriverFactory';
import { IDatabaseDriver } from '../../database/drivers/IDatabaseDriver';
import { ColumnItem } from '../../tree/ColumnItem';
import { ExtensionConfig } from '../../utils/Config';

interface MessagePayload {
	data: any[]; // Ou o tipo correto dos seus dados
	columns?: ColumnItem[]; // O ponto de interrogação torna 'columns' opcional
	page: number;
	totalPages: number;
	pageSize: number;
	autoSave: boolean;
}

interface MessageBase {
	type: 'initializeTable' | 'refreshTable';
	payload: MessagePayload;
}

export class TableViewPanel {

	public static currentPanel: TableViewPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _table: TableItem;
	private _pageSize = ExtensionConfig.get().pageSize;
	private _currentPage = 1;
	private _totalPages = 1;
	private _searchText?: string = "";
	private _column?: string = "";

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, table: TableItem) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._table = table;
		this._currentPage = 1;

		// Quando o painel for fechado, chama dispose
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Atualiza o HTML do painel
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
		this._sendForHtmlWebview(true); // Envia os dados para o HTML
		// this._setWebviewMessageListener(this._panel.webview); // Escuta as mensagens do HTML
		this._panel.webview.onDidReceiveMessage(
			this._setWebviewMessageListener.bind(this),
			undefined,
			this._disposables
		);
	}

	public static renderNew(extensionUri: vscode.Uri, table: TableItem) {
		const panel = vscode.window.createWebviewPanel(
			'tableView',
			'Nova Tabela - ' + table.tableName,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media/table')],
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
			TableViewPanel.currentPanel._currentPage = 1;
			TableViewPanel.currentPanel._sendForHtmlWebview(true);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'tableView',
			'Visualizar Tabela - ' + table.tableName + ' - ' + table.dbName,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media/table')],
				retainContextWhenHidden: true, // <-- Mantém o estado ao esconder
			}
		);

		TableViewPanel.currentPanel = new TableViewPanel(panel, extensionUri, table);

	}


	private _getHtmlForWebview(webview: vscode.Webview): string {
		const mediaPath = vscode.Uri.joinPath(this._extensionUri, 'media/table');

		const htmlPath = path.join(this._extensionUri.fsPath, 'media/table', 'index.html');
		let htmlContent = fs.readFileSync(htmlPath, 'utf8');

		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'script.js'));


		htmlContent = htmlContent
			.replace('./style.css', styleUri.toString())
			.replace('./script.js', scriptUri.toString());

		return htmlContent;
	}

	private async _setWebviewMessageListener(message: any) {
		try {
			const connectionManager = ConnectionManager.getInstance();
			const connection = connectionManager.getConnection(this._table.dbName);

			if (!connection) {
				vscode.window.showWarningMessage(`Conexão perdida com o banco ${this._table.dbName}. Fechando painel.`);
				this._panel.dispose(); // Fecha o Webview para não deixar a tela travada
				return;
			}

			const driver = await DriverFactory.create(connection, this._table.dbName);
			// console.log('Mensagem recebida do webview HTML: ', message);

			switch (message.type) {
				case 'insert':
					await driver.insertRow(this._table.tableName, message.data);
					vscode.window.showInformationMessage('Inserido novo registro');
					this._sendForHtmlWebview();
					break;
				case 'update':
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
					this._currentPage = 1;
					this._column = "";
					this._searchText = "";
					this._sendForHtmlWebview(false, message.value, message.column);
					vscode.window.showInformationMessage('Recarregar dados da tabela');
					break;
				case 'search':
					this._currentPage = 1;
					this._column = message.column ?? "";
					this._searchText = message.value ?? "";
					await this._sendForHtmlWebview(false);
					if (message.page >= 1 && message.page <= this._totalPages) {
						this._currentPage = message.page;
					}
					vscode.window.showInformationMessage(`Buscar por: ${message.value} na coluna ${message.column}`);
					break;
				case 'saveAll':
					this.saveDataAll(driver, message.insert, message.update);
					this._sendForHtmlWebview();
					break;
				case 'changePage':
					const newPage = message.page;
					if (newPage >= 1 && newPage <= this._totalPages) {
						this._currentPage = newPage;
						await this._sendForHtmlWebview(false);
					}
					break;
			}
		} catch (error: any) {
			vscode.window.showErrorMessage('Erro: ' + error.message);
		}
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

	private async _sendForHtmlWebview(initialize = false, searchText?: string, column?: string) {
		const connectionManager = ConnectionManager.getInstance().getConnection(this._table.dbName);
		const driver = await DriverFactory.create(connectionManager, this._table.dbName);

		const offset = (this._currentPage - 1) * this._pageSize;
		const { rows, total } = await driver.getAllRows(this._table.tableName, this._pageSize, offset, this._searchText, this._column);

		this._totalPages = Math.ceil(total / this._pageSize) || 1;

		const messageBase: MessageBase = {
			type: initialize ? 'initializeTable' : 'refreshTable',
			payload: {
				data: rows,
				page: this._currentPage,
				totalPages: this._totalPages,
				pageSize: this._pageSize,
				autoSave: ExtensionConfig.get().autoSave
			},
		};

		if (initialize) {
			messageBase.payload.columns = this._table.columns;
		}

		this._panel.webview.postMessage(messageBase);
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