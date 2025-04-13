import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';

export class DatabaseClient {
    private db?: sqlite3.Database;
    private connectedFilePath?: string;

    async connect(filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(filePath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.connectedFilePath = filePath;
                vscode.window.showInformationMessage(`Connected to database: ${path.basename(filePath)}`);
                resolve();
            });
        });
    }

    async getTables(): Promise<string[]> {
        if (!this.db) {
            throw new Error('Not connected to any database.');
        }

        return new Promise((resolve, reject) => {
            type ColumnInfo = { name: string; type: string };

            this.db!.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`, (err, rows: { name: string }[]) => {
                if (err) {
                    reject(err);
                    return;
                }

                const tables = rows.map(row => row.name);
                resolve(tables);
            });
        });
    }
}
