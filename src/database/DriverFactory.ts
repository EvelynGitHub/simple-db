// src/database/DriverFactory.ts
import { ConnectionConfig } from './ConnectionManager';
import { SQLiteDriver } from './drivers/SQLiteDriver';
import { IDatabaseDriver } from './drivers/IDatabaseDriver';

/**
 * Fábrica de criação de Drivers de banco de dados.
 * Agora com cache para reaproveitamento de conexões.
 */
export class DriverFactory {
    // Cache de drivers já conectados
    private static drivers: { [dbName: string]: IDatabaseDriver } = {};

    /**
     * Cria (ou reaproveita) um driver de banco para uma conexão.
     * @param config Dados da conexão
     * @param dbName Nome do banco
     */
    static async create(config: ConnectionConfig, dbName: string): Promise<IDatabaseDriver> {
        // Se já existe driver no cache, usa ele
        if (DriverFactory.drivers[dbName]) {
            return DriverFactory.drivers[dbName];
        }

        // Caso contrário, cria e conecta um novo driver
        if (config.type === 'sqlite' && config.path) {
            const driver = new SQLiteDriver(config.path);
            await driver.connect();
            DriverFactory.drivers[dbName] = driver;
            return driver;
        }

        throw new Error(`Driver para ${config.type} ainda não implementado.`);
    }

    /**
     * Remove um driver do cache (ex: ao remover uma conexão).
     * @param dbName Nome do banco
     */
    static async disconnect(dbName: string) {
        const driver = DriverFactory.drivers[dbName];
        if (driver) {
            try {
                if ((driver as any).close) {
                    await (driver as any).close(); // Opcional: implementar método close() nos drivers
                }
            } catch (error) {
                console.error(`Erro ao fechar driver ${dbName}:`, error);
            }
            delete DriverFactory.drivers[dbName];
        }
    }
}
