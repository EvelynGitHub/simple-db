// src/views/TableViewPanel.ts
import * as vscode from 'vscode';
import { ConnectionManager } from '../database/ConnectionManager';

export class TableViewPanel {
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
        try {
          await connectionManager.updateRow(dbName, tableName, message.primaryKey, message.primaryKeyValue, message.data);
          vscode.window.showInformationMessage('Registro atualizado com sucesso!');
          await loadData();
        } catch (error: any) {
          vscode.window.showErrorMessage('Erro ao atualizar: ' + error.message);
        }
      }

      if (message.command === 'insertRow') {
        const data = message.data;
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(_ => '?').join(', ');
        const values = Object.values(data);

        const db = ConnectionManager.getInstance().getDatabase(dbName);
        db.run(
          `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
          values,
          (err) => {
            if (err) {
              vscode.window.showErrorMessage('Erro ao inserir: ' + err.message);
            } else {
              vscode.window.showInformationMessage('Registro inserido com sucesso');
            }
          }
        );
      }

      if (message.command === 'deleteRow') {
        const { primaryKey, primaryKeyValue } = message;

        const db = ConnectionManager.getInstance().getDatabase(dbName);
        db.run(
          `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`,
          [primaryKeyValue],
          (err) => {
            if (err) {
              vscode.window.showErrorMessage('Erro ao deletar: ' + err.message);
            } else {
              vscode.window.showInformationMessage('Registro deletado com sucesso');
            }
          }
        );
      }
    });

  }

  private static getHtmlForTable(rows: any[], dbName: string, tableName: string): string {
    if (rows.length === 0) {
      // return `<h3>Nenhum registro encontrado em ${tableName}</h3>`;
      return `<html><body><h3>Nenhum dado encontrado</h3></body></html>`;
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
          th { background-color: #f2f2f2; }
          button { margin: 2px; }
        </style>
      </head>
      <body>
        <h2>${tableName}</h2>
        <div>
          <input id="searchInput" type="text" placeholder="Buscar..." />
          <button onclick="search()">Buscar</button>
          <button onclick="refresh()">🔄 Atualizar</button>
        </div>
        <button onclick="insertRow()">Inserir Novo</button>
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
}
// 