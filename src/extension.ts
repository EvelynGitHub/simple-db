// src/extension.ts

import * as vscode from 'vscode';
import { DatabaseTreeProvider } from './tree/DatabaseTreeProvider';
import { RegisterCommands } from './commands/RegisterCommands';

export function activate(context: vscode.ExtensionContext) {
	const treeProvider = new DatabaseTreeProvider();
	vscode.window.registerTreeDataProvider('simpleDbExplorer', treeProvider);

	RegisterCommands(context, treeProvider);
}

export function deactivate() { }
