import { ConnectionConfig } from './ConnectionManager';
import { SQLiteDriver } from './drivers/SQLiteDriver';
import { IDatabaseDriver } from './drivers/IDatabaseDriver';

export class DriverFactory {
    static async create(config: ConnectionConfig): Promise<IDatabaseDriver> {
        if (config.type === 'sqlite' && config.path) {
            const driver = new SQLiteDriver(config.path);
            await driver.connect();
            return driver;
        }

        // Futuramente: suporte a MySQL e Postgres aqui
        throw new Error(`Driver para ${config.type} ainda não implementado`);
    }
}
