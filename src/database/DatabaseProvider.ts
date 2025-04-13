// src/providers/DatabaseProvider.ts
import * as vscode from 'vscode';
import { DatabaseClient } from './DatabaseClient';

export class DatabaseProvider implements vscode.TreeDataProvider<DatabaseItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DatabaseItem | undefined> = new vscode.EventEmitter<DatabaseItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<DatabaseItem | undefined> = this._onDidChangeTreeData.event;

    constructor(private dbClient: DatabaseClient) { }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: DatabaseItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<DatabaseItem[]> {
        try {
            const tables = await this.dbClient.getTables();
            return tables.map(tableName => new DatabaseItem(tableName));
        } catch (error) {
            return [];
        }
    }
}

export class DatabaseItem extends vscode.TreeItem {
    constructor(public readonly label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'table';
    }
}
