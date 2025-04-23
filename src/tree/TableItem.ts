import * as vscode from 'vscode';
import { DatabaseItem } from './DatabaseItem';
import { ColumnItem } from './ColumnItem';

export class TableItem extends vscode.TreeItem {
    public columns: ColumnItem[] = [];

    constructor(
        public readonly dbName: string,
        public readonly tableName: string,
    ) {
        super(tableName, vscode.TreeItemCollapsibleState.Collapsed);

        this.contextValue = 'tableItem';
        this.iconPath = new vscode.ThemeIcon('table');
    }
}
