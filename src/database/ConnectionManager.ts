// src/database/ConnectionManager.ts
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { ColumnItem } from '../tree/ColumnItem';

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

    public getDatabase(dbName: string): sqlite3.Database {
        const db = this.connections.get(dbName);
        if (!db) {
            throw new Error('Banco de dados não encontrado');
        }
        return db;
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

    async close(dbName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const db = this.connections.get(dbName);
            if (db) {
                db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.connections.delete(dbName);
                        resolve();
                    }
                });
            } else {
                resolve();
            }
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

    async getColumns(dbName: string, tableName: string): Promise<ColumnItem[]> {
        const db = this.getConnection(dbName);
        if (!db) {
            return [];
        }
        return new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(${tableName});`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // resolve(rows.map((r: any) => r.name));
                    resolve(rows.map((r: any) => new ColumnItem(
                        r.name,
                        r.type,
                        r.length ?? null,
                        null,
                        r.dflt_value,
                        r.notnull === 1,
                        r.pk === 1,
                        r.unique === 1,
                        r.pk === 1 && r.type === 'INTEGER' && r.dflt_value === 'AUTOINCREMENT'
                    )));
                }
            });
        });
    }

    async getAllRows(dbName: string, tableName: string, searchText?: string, column?: string): Promise<any[]> {
        const db = this.getConnection(dbName);
        if (!db) {
            throw new Error('Banco de dados não encontrado');
        }

        let sql = `SELECT * FROM ${tableName} `;
        const params: any[] = [];

        if (column && searchText) {
            sql += `WHERE ${column} LIKE ?`;
            params.push(`%${searchText}%`);
        }

        sql += ` LIMIT 10`;

        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async updateRow(dbName: string, tableName: string, primaryKeyColumn: string, primaryKeyValue: any, data: any): Promise<any[]> {
        const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = Object.values(data);

        values.push(primaryKeyValue);

        const db = this.getDatabase(dbName);
        const sql = `UPDATE ${tableName} SET ${sets} WHERE ${primaryKeyColumn} = ?`;

        return new Promise((resolve, reject) => {
            db.run(sql, values, function (err: Error | null, rows: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async insertRow(dbName: string, tableName: string, data: any): Promise<any[]> {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(_ => '?').join(', ');
        const values = Object.values(data);

        const db = this.getDatabase(dbName);
        const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

        return new Promise((resolve, reject) => {
            db.run(sql, values, function (err: Error | null, rows: any) {
                if (err) {
                    reject("Problema ou cadastrar: " + err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async deleteRow(dbName: string, tableName: string, primaryKeyColumn: string, primaryKeyValue: any): Promise<any[]> {
        const db = this.getDatabase(dbName);
        const sql = `DELETE FROM ${tableName} WHERE ${primaryKeyColumn} = ?`;

        return new Promise((resolve, reject) => {
            db.run(sql, [primaryKeyValue], function (err: Error | null, rows: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}
