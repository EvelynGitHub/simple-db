// src/database/ConnectionManager.ts
import * as vscode from 'vscode';

export type ConnectionConfig = {
    name: string; // nome do banco de dados
    type: 'sqlite' | 'mysql' | 'postgres';
    database?: string; // nome do banco de dados
    path?: string;    // caminho do arquivo, usado para SQLite
    host?: string;    // endereço do servidor, usado para MySQL/Postgres
    user?: string;    // usuário de conexão
    password?: string; // senha de conexão
};

export class ConnectionManager {
    private static instance: ConnectionManager;
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
}
