// src/views/TableViewPanel.ts
import * as vscode from 'vscode';
import { ConnectionManager } from '../database/ConnectionManager';

export class TableViewPanel {
    public static async showTable(dbName: string, tableName: string) {
        console.log(`Abrindo table: ${tableName} do database: ${dbName}`);

        const panel = vscode.window.createWebviewPanel(
            'simpleDbTableView',
            `Tabela: ${tableName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
            }
        );

        const connectionManager = ConnectionManager.getInstance();
        const rows = await connectionManager.getAllRows(dbName, tableName);

        console.log(`Rows: ${JSON.stringify(rows)}`);

        panel.webview.html = TableViewPanel.getHtmlContent(tableName, rows);
    }

    private static getHtmlContent(tableName: string, rows: any[]): string {
        if (rows.length === 0) {
            return `<h2>Tabela: ${tableName}</h2><p>Sem registros.</p>`;
        }

        const headers = Object.keys(rows[0]);
        const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
        const bodyHtml = rows.map(row => `
      <tr>
        ${headers.map(h => `<td>${row[h]}</td>`).join('')}
      </tr>
    `).join('');

        return `
      <!DOCTYPE html>
      <html lang="en">
      <body>
        <h2>Tabela: ${tableName}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </body>
      </html>
    `;
    }
}
