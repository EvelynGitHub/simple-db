import * as vscode from 'vscode';

interface ConfigSchema {
    pageSize: number;
    autoSave: boolean;
    autoComplete: boolean;
}

const DEFAULT_CONFIG: ConfigSchema = {
    pageSize: 20,
    autoSave: true,
    autoComplete: true,
};

export class ExtensionConfig {
    private static readonly key = 'simpleDb';

    // static get(): ConfigSchema {
    //     const config = vscode.workspace.getConfiguration();
    //     const stored = config.get<ConfigSchema>(this.key);
    //     return { ...DEFAULT_CONFIG, ...stored };
    // }

    static async update(newConfig: Partial<ConfigSchema>) {
        const current = this.get();
        const updated = { ...current, ...newConfig };
        await vscode.workspace.getConfiguration().update(
            this.key,
            updated,
            vscode.ConfigurationTarget.Global
        );
    }


    static get() {
        const config = vscode.workspace.getConfiguration(this.key);
        return {
            pageSize: config.get<number>('pageSize') ?? 5,
            autoSave: config.get<boolean>('autoSave') ?? false,
            autoComplete: config.get<boolean>('autoComplete') ?? false,
        };
    }

    static async updateAll(settings: { pageSize?: number; autoSave?: boolean; autoComplete?: boolean }) {
        const config = vscode.workspace.getConfiguration(this.key);
        await Promise.all([
            config.update('pageSize', settings.pageSize, vscode.ConfigurationTarget.Global),
            config.update('autoSave', settings.autoSave, vscode.ConfigurationTarget.Global),
            config.update('autoComplete', settings.autoComplete, vscode.ConfigurationTarget.Global),
        ]);
    }
}
