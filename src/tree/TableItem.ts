import * as vscode from 'vscode';
import { DatabaseItem } from './DatabaseItem';

export class TableItem extends vscode.TreeItem {
    //     constructor(
    //         public readonly tableName: string
    //     ) {
    //         super(tableName, vscode.TreeItemCollapsibleState.None);
    //         this.contextValue = 'tableItem';
    //         this.iconPath = new vscode.ThemeIcon('table');
    //     }
    // constructor(
    //     public readonly label: string,
    //     public readonly database: DatabaseItem
    // ) {
    //     super(label, vscode.TreeItemCollapsibleState.None);
    //     this.contextValue = 'tableItem';
    //     this.command = {
    //         command: 'simple-db.openTable',
    //         title: 'Open Table',
    //         arguments: [this]
    //     };
    // }

    constructor(
        public readonly dbName: string,
        public readonly tableName: string
    ) {
        super(tableName, vscode.TreeItemCollapsibleState.Collapsed);

        this.contextValue = 'tableItem';
        this.iconPath = new vscode.ThemeIcon('table');
    }
}
