// src/database/ConnectionManager.ts
import * as sqlite3 from 'sqlite3';
import * as path from 'path';

export class ConnectionManager {
    private static instance: ConnectionManager;
    private connections: Map<string, sqlite3.Database> = new Map();

    private constructor() { }

    public static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    getConnection(dbName: string): sqlite3.Database | undefined {
        return this.connections.get(dbName);
    }

    async connect(databasePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(databasePath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    const dbName = path.basename(databasePath);
                    this.connections.set(dbName, db);
                    resolve(dbName);
                }
            });
        });
    }

    async getTables(dbName: string): Promise<string[]> {
        const db = this.getConnection(dbName);
        if (!db) {
            return [];
        }
        return new Promise((resolve, reject) => {
            db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((r: any) => r.name));
                }
            });
        });
    }

    async getColumns(dbName: string, tableName: string): Promise<any[]> {
        const db = this.getConnection(dbName);
        if (!db) {
            return [];
        }
        return new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(${tableName});`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((r: any) => r.name));
                }
            });
        });
    }

    async getAllRows(dbName: string, tableName: string): Promise<any[]> {
        const db = this.getConnection(dbName);
        if (!db) {
            throw new Error('Banco de dados não encontrado');
        }

        const sql = `SELECT * FROM ${tableName}`;

        return new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}
