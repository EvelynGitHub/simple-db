// src/tree/ColumnItem.ts
import * as vscode from 'vscode';

export class ColumnItem extends vscode.TreeItem {
    constructor(
        public readonly columnName: string,
        public readonly dataType: string | null = null,
        public readonly length: number | null = null,
        public readonly columnComment: string | null = null,
        public readonly defaultValue: string | null = null,
        public readonly notNull: boolean = false,
        public readonly primaryKey: boolean = false,
        public readonly unique: boolean = false,
        public readonly isAutoIncrement: boolean = false,
        public readonly foreignKey: boolean = false
    ) {
        super(columnName, vscode.TreeItemCollapsibleState.None);

        this.contextValue = 'columnItem';

        if (this.primaryKey) {
            this.iconPath = new vscode.ThemeIcon('key');
        } else if (this.foreignKey) {
            this.iconPath = new vscode.ThemeIcon('link');
        } else
            this.iconPath = new vscode.ThemeIcon('symbol-field');
    }
}
