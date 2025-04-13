// src/tree/DatabaseTreeProvider.ts

import * as vscode from 'vscode';
import { DatabaseItem } from './DatabaseItem';
import { TableItem } from './TableItem';
import { ConnectionManager } from '../database/ConnectionManager';
import { ColumnItem } from './ColumnItem';

// export class DatabaseTreeProvider implements vscode.TreeDataProvider<DatabaseItem> {
//     private _onDidChangeTreeData: vscode.EventEmitter<DatabaseItem | undefined | void> = new vscode.EventEmitter();
//     readonly onDidChangeTreeData: vscode.Event<DatabaseItem | undefined | void> = this._onDidChangeTreeData.event;

export class DatabaseTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private databases: DatabaseItem[] = [];
    private connectionManager: ConnectionManager = new ConnectionManager();

    constructor(private context: vscode.ExtensionContext) { }

    // constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DatabaseItem): vscode.TreeItem {
        return element;
    }

    // getChildren(element?: DatabaseItem): Thenable<DatabaseItem[]> {
    //     if (!element) {
    //         // Nível raiz: mostrar conexões
    //         return Promise.resolve(this.databases);
    //     }
    //     return Promise.resolve([]);
    // }

    // addDatabase(label: string) {
    //     this.databases.push(new DatabaseItem(label));
    //     this.refresh();
    // }

    async connect(databasePath: string) {
        const dbName = await this.connectionManager.connect(databasePath);
        this.databases.push(new DatabaseItem(dbName, databasePath));
        this.refresh();
    }


    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!element) {
            return this.databases;
        }

        if (element instanceof DatabaseItem) {
            const tables = await this.connectionManager.getTables(element.label as string);
            return tables.map(tableName => new TableItem(element.label as string, tableName));
        }

        if (element instanceof TableItem) {
            const columns = await this.connectionManager.getColumns(element.dbName, element.tableName);
            return columns.map((col: any) => new ColumnItem(col));
        }

        return [];
    }
}
