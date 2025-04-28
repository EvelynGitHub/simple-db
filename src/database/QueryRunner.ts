// src/database/QueryRunner.ts

import { DriverFactory } from './DriverFactory';
import { ConnectionManager } from './ConnectionManager';

export class QueryRunner {
    /**
     * Executa uma query SQL livre em um banco de dados conectado
     * @param dbName Nome do banco conectado
     * @param query Query SQL a ser executada
     * @returns Resultado da execução (dados ou mensagem)
     */
    static async runQuery(dbName: string, query: string): Promise<{ success: boolean; result: any }> {
        const connectionManager = ConnectionManager.getInstance();
        const connection = connectionManager.getConnection(dbName);

        if (!connection) {
            return { success: false, result: `Conexão com banco '${dbName}' não encontrada.` };
        }

        try {
            const driver = await DriverFactory.create(connection, dbName);
            const result = await driver.executeQuery(query);

            return { success: true, result };

        } catch (error: any) {
            console.error('Erro ao executar query:', error);
            return { success: false, result: error.message || 'Erro desconhecido ao executar a query.' };
        }
    }
}
