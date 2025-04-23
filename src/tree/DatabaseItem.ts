import * as vscode from 'vscode';
import { TableItem } from './TableItem';

export class DatabaseItem extends vscode.TreeItem {
    public tables: TableItem[] = [];

    constructor(
        public readonly label: string,
        public readonly filePath: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'databaseItem';
        this.iconPath = new vscode.ThemeIcon('database');
    }
}
