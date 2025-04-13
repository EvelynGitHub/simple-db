// src/tree/ColumnItem.ts
import * as vscode from 'vscode';

export class ColumnItem extends vscode.TreeItem {
    constructor(
        public readonly columnName: string
    ) {
        super(columnName, vscode.TreeItemCollapsibleState.None);

        this.contextValue = 'columnItem';
        this.iconPath = new vscode.ThemeIcon('symbol-field');
    }
}
