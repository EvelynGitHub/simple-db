// src/views/TableViewPanel.ts
import * as vscode from 'vscode';
import { ConnectionManager } from '../database/ConnectionManager';
import * as path from 'path';
import * as fs from 'fs';
import { TableItem } from '../tree/TableItem';

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
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
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
			'Visualizar Tabela - ' + table.tableName,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
				retainContextWhenHidden: true, // <-- Mantém o estado ao esconder
			}
		);

		TableViewPanel.currentPanel = new TableViewPanel(panel, extensionUri, table);

	}


	private _getHtmlForWebview(webview: vscode.Webview): string {
		const mediaPath = vscode.Uri.joinPath(this._extensionUri, 'media');

		const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'tableView.html');
		let htmlContent = fs.readFileSync(htmlPath, 'utf8');

		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'script.js'));


		htmlContent = htmlContent
			.replace('./style.css', styleUri.toString())
			.replace('./script.js', scriptUri.toString());

		return htmlContent;
	}

	private _setWebviewMessageListener(webview: vscode.Webview) {

		const connectionManager = ConnectionManager.getInstance();

		webview.onDidReceiveMessage(
			async (message) => {
				try {
					console.log('Mensagem recebida do webview HTML: ', message);

					switch (message.type) {
						case 'insert':
							await connectionManager.insertRow(this._table.dbName, this._table.tableName, message.data);
							vscode.window.showInformationMessage('Inserido novo registro');
							this._sendForHtmlWebview();
							break;
						case 'update':
							await connectionManager.updateRow(this._table.dbName, this._table.tableName, message.primaryKey, message.primaryKeyValue, message.data);
							vscode.window.showInformationMessage('Atualizar registros selecionados');
							this._sendForHtmlWebview();
							break;
						case 'delete':
							console.log('Deletar registro', message.primaryKey, message.primaryKeyValue);

							await connectionManager.deleteRow(this._table.dbName, this._table.tableName, message.primaryKey, message.primaryKeyValue);
							console.log("Depois do await");
							vscode.window.showInformationMessage('Deletar registros selecionados');
							this._sendForHtmlWebview();
							break;
						case 'refresh':
							this._sendForHtmlWebview();
							vscode.window.showInformationMessage('Recarregar dados da tabela');
							break;
						case 'search':
							this._sendForHtmlWebview(message.value);
							vscode.window.showInformationMessage(`Buscar por: ${message.value}`);
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

	private async _sendForHtmlWebview(searchText?: string) {
		const connectionManager = ConnectionManager.getInstance();

		const rows = await connectionManager.getAllRows(this._table.dbName, this._table.tableName, searchText);
		// const columns = Object.keys(rows[0]);
		const columns = this._table.columns;

		console.log('Enviando dados para o HTML COLUNAS', this._table);

		this._panel.webview.postMessage({
			type: 'renderTable',
			payload: {
				// dbName: this._dbName,
				// tableName: this._tableName,
				data: rows,
				columns
			},
			columns,
			rows
		})
	}


	/*
		static showTable(dbName: string, tableName: string) {
			const panel = vscode.window.createWebviewPanel(
				'tableView',
				`${dbName} - ${tableName}`,
				vscode.ViewColumn.One,
				{
					enableScripts: true,
				}
			);
	
			const connectionManager = ConnectionManager.getInstance();
	
			async function loadData(searchText?: string) {
				const rows = await connectionManager.getAllRows(dbName, tableName, searchText);
				panel.webview.html = TableViewPanel.getHtmlForTable(rows, dbName, tableName);
			}
	
			async function updateData(primaryKey: string, primaryKeyValue: any, data: any) {
				try {
					await connectionManager.updateRow(dbName, tableName, primaryKey, primaryKeyValue, data);
					vscode.window.showInformationMessage('Registro atualizado com sucesso!');
					await loadData();
				} catch (error: any) {
					vscode.window.showErrorMessage('Erro ao atualizar: ' + error.message);
				}
			}
	
			async function insertData(primaryKey: string, primaryKeyValue: any, data: any) {
				try {
					await connectionManager.insertRow(dbName, tableName, primaryKey, primaryKeyValue, data);
					vscode.window.showInformationMessage('Registro inserido com sucesso');
					await loadData();
				} catch (error: any) {
					vscode.window.showErrorMessage('Erro ao inserir: ' + error.message);
				}
			}
	
			async function deleteData(primaryKey: string, primaryKeyValue: any) {
				try {
					await connectionManager.deleteRow(dbName, tableName, primaryKey, primaryKeyValue);
					vscode.window.showInformationMessage('Registro deletado com sucesso');
					await loadData();
				} catch (error: any) {
					vscode.window.showErrorMessage('Erro ao deletar: ' + error.message);
				}
			}
	
			loadData();
	
			panel.webview.onDidReceiveMessage(async message => {
				if (message.command === 'searchTable') {
					const searchText = message.searchText;
					await loadData(searchText);
				}
	
				if (message.command === 'refreshTable') {
					await loadData();
				}
	
				if (message.command === 'updateRow') {
					await updateData(message.primaryKey, message.primaryKeyValue, message.data);
				}
	
				if (message.command === 'insertRow') {
					await insertData(message.primaryKey, message.primaryKeyValue, message.data);
				}
	
				if (message.command === 'deleteRow') {
					await deleteData(message.primaryKey, message.primaryKeyValue);
				}
			});
	
		}
	
		private static getHtmlForTable2(rows: any[], dbName: string, tableName: string): string {
			if (rows.length === 0) {
				return `<html><body><h3>Nenhum dado encontrado em ${tableName}</h3></body></html>`;
			}
	
			const headers = Object.keys(rows[0]);
			const headerHtml = headers.map(header => `<th>${header}</th>`).join('');
	
			const rowsHtml = rows.map(row => {
				const cells = headers.map(header => `<td contenteditable="true" data-col="${header}">${row[header] ?? ''}</td>`).join('');
				return `<tr>
					${cells}
					<td>
					  <button onclick="saveRow(this)">Salvar</button>
					  <button onclick="deleteRow(this)">Excluir</button>
					</td>
				  </tr>`;
			}).join('');
	
			return `
		  <html>
		  <head>
			<meta charset="UTF-8">
			<style>
			  table { border-collapse: collapse; width: 100%; }
			  th, td { border: 1px solid #ddd; padding: 8px; }
			  th { background-color: #bbb; color: black; }
			  button { margin: 2px; }
			</style>
		  </head>
		  <body>
			<h2>${tableName}</h2>
			<div>
			  <input id="searchInput" type="text" placeholder="Buscar..." />
			  <button onclick="search()">Buscar</button>
			  <button onclick="refresh()">🔄 Atualizar</button>
			  <button onclick="insertRow()">Inserir Novo</button>
			</div>
			<table>
			  <thead><tr>${headerHtml}<th>Ações</th> </tr></thead>
			  <tbody>${rowsHtml}</tbody>
			</table>
	
			<script>
			  const vscode = acquireVsCodeApi();
			  const columns = ${JSON.stringify(headers)};
	
			  function search() {
				const searchText = document.getElementById('searchInput').value;
				vscode.postMessage({ command: 'searchTable', searchText });
			  }
		    
			  function refresh() {
				vscode.postMessage({ command: 'refreshTable' });
			  }
	
			  function getRowData(tr) {
				const data = {};
				tr.querySelectorAll('td[data-col]').forEach(td => {
				  data[td.dataset.col] = td.innerText;
				});
				return data;
			  }
	
			  function saveRow(button) {
				const tr = button.closest('tr');
				const tds = tr.querySelectorAll('td[data-col]');
				const primaryKey = tds[0]?.dataset.col;
				const primaryKeyValue = tds[0]?.innerText;
				const data = getRowData(tr);
	
				vscode.postMessage({
				  command: 'updateRow',
				  primaryKey,
				  primaryKeyValue,
				  data
				});
			  }
	
			  function insertRow() {
				const tableBody = document.querySelector('tbody');
				const tr = document.createElement('tr');
	
				columns.forEach(col => {
				  const td = document.createElement('td');
				  td.contentEditable = "true";
				  td.setAttribute('data-col', col);
				  tr.appendChild(td);
				});
	
				const actionTd = document.createElement('td');
				const saveBtn = document.createElement('button');
				saveBtn.innerText = "Salvar";
				saveBtn.onclick = () => {
				  const data = getRowData(tr);
				  vscode.postMessage({
					command: 'insertRow',
					data
				  });
				};
				actionTd.appendChild(saveBtn);
	
				tr.appendChild(actionTd);
				tableBody.appendChild(tr);
			  }
	
			  function deleteRow(button) {
				const tr = button.closest('tr');
				const tds = tr.querySelectorAll('td[data-col]');
				const primaryKey = tds[0]?.dataset.col;
				const primaryKeyValue = tds[0]?.innerText;
	
				vscode.postMessage({
				  command: 'deleteRow',
				  primaryKey,
				  primaryKeyValue
				});
				tr.remove();
			  }
			</script>
		  </body>
		  </html>
		  `;
	
		}
	
		*/
}
// 