// src/tree/DatabaseTreeProvider.ts

import * as vscode from 'vscode';
import { DatabaseItem } from './DatabaseItem';
import { TableItem } from './TableItem';
import { ConnectionManager } from '../database/ConnectionManager';
import { ColumnItem } from './ColumnItem';
import { DriverFactory } from '../database/DriverFactory';

export class DatabaseTreeProvider implements vscode.TreeDataProvider<DatabaseItem | TableItem | ColumnItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DatabaseItem | TableItem | ColumnItem | undefined | void> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<DatabaseItem | TableItem | ColumnItem | undefined | void> = this._onDidChangeTreeData.event;

    private databases: DatabaseItem[] = [];
    private connectionManager: ConnectionManager;

    constructor(private context: vscode.ExtensionContext) {
        ConnectionManager.getInstance().initialize(this.context.globalState);
        this.connectionManager = ConnectionManager.getInstance();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DatabaseItem): vscode.TreeItem {
        return element;
    }

    async deleteDatabase(filePath: string) {
        const dbName = this.databases.find(db => db.config.path === filePath);
        if (dbName) {
            const config = this.connectionManager.getConnection(dbName.label);
            const driver = await DriverFactory.create(config, dbName.label as string);
            await driver.close();

            this.connectionManager.removeConnection(dbName.label as string);
            this.databases = this.databases.filter(db => db.config.path !== filePath);
            this.refresh();
        }
    }

    async connect(databasePath: string) {
        const dbName = await this.connectionManager.connect(databasePath);
        this.connectionManager.registerConnection({
            path: databasePath,
            type: 'sqlite',
            name: dbName
        });
        this.databases.push(new DatabaseItem(dbName, { name: dbName, type: 'sqlite', path: databasePath }));
        this.refresh();
        return dbName as string;
    }

    async getChildren(element?: DatabaseItem | TableItem | ColumnItem): Promise<(DatabaseItem | TableItem | ColumnItem)[]> {
        if (!element) {
            const connections = this.connectionManager.getConnections();
            this.databases = Object.entries(connections).map(([dbName, config]) =>
                new DatabaseItem(dbName, config)
            );
            return this.databases;
        }

        if (element instanceof DatabaseItem) {
            // Listar tabelas do banco selecionado
            const config = this.connectionManager.getConnection(element.label!);
            if (!config) return [];

            try {
                const driver = await DriverFactory.create(config, element.label);
                const tables = await driver.getTables();
                return tables.map(table => {
                    const tableItem = new TableItem(element.label, table);
                    // tableItem.contextValue = 'tableItem';
                    return tableItem;
                });
            } catch (error: any) {
                vscode.window.showErrorMessage(`Erro ao carregar tabelas: ${error.message}`);
                return [];
            }
        }

        if (element instanceof TableItem) {
            // Listar colunas da tabela selecionada
            const dbElement = element.dbName// as DatabaseItem;
            const config = this.connectionManager.getConnection(dbElement);
            if (!config) return [];

            try {
                const driver = await DriverFactory.create(config, dbElement);
                const columns = await driver.getColumns(element.tableName);
                element.columns = columns;
                return columns;
            } catch (error: any) {
                vscode.window.showErrorMessage(`Erro ao carregar colunas: ${error.message}`);
                return [];
            }
        }

        return [];
    }
}
