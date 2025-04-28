// src/database/ConnectionManager.ts
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { ColumnItem } from '../tree/ColumnItem';
import * as vscode from 'vscode';

export type ConnectionConfig = {
    name: string; // nome do banco de dados
    type: 'sqlite' | 'mysql' | 'postgres';
    path?: string;    // caminho do arquivo, usado para SQLite
    host?: string;    // endereço do servidor, usado para MySQL/Postgres
    user?: string;    // usuário de conexão
    password?: string; // senha de conexão
};

export class ConnectionManager {
    private static instance: ConnectionManager;
    // private connections: Map<string, sqlite3.Database> = new Map();
    // private connections: { [dbName: string]: any } = {}; 
    // private connections: { [dbName: string]: { path: string } } = {};
    private connections: { [dbName: string]: ConnectionConfig } = {};

    private globalState?: vscode.Memento;

    private constructor() { }

    public static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    public initialize(globalState: vscode.Memento) {
        this.globalState = globalState;
        this.restoreConnections();
    }

    public registerConnection(config: ConnectionConfig) {
        this.connections[config.name] = config;
        this.saveConnections();
    }

    private saveConnections() {
        if (this.globalState) {
            this.globalState.update('simpleDb.connections', this.connections);
        }
    }

    private restoreConnections() {
        if (this.globalState) {
            const saved = this.globalState.get<{ [dbName: string]: any }>('simpleDb.connections', {});
            this.connections = saved;
        }
    }

    public getConnections(): { [dbName: string]: any } {
        return this.connections;
    }

    public getConnection(dbName: string): ConnectionConfig {
        return this.connections[dbName];
    }

    public removeConnection(dbName: string) {
        if (this.connections[dbName]) {
            delete this.connections[dbName];
            this.saveConnections();
        }
    }


    // getConnection(dbName: string): sqlite3.Database | undefined {
    //     return this.connections.get(dbName);
    // }

    // public getDatabase(dbName: string): sqlite3.Database {
    // const db = this.connections.get(dbName);
    // if (!db) {
    //     throw new Error('Banco de dados não encontrado');
    // }
    // return db;
    // }

    async connect(databasePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(databasePath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    const dbName = path.basename(databasePath);
                    this.registerConnection({
                        type: `sqlite`, path: databasePath,
                        name: dbName
                    });
                    resolve(dbName);
                }
            });
        });
    }
}
