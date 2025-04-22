import * as vscode from 'vscode';

export class DatabaseItem extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly filePath: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'databaseItem';
        this.iconPath = new vscode.ThemeIcon('database');
    }
}
