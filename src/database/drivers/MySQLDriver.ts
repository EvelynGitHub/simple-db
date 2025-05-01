// Banco | Precisa instalar
// MySQL | npm install mysql2
// PostgreSQL | npm install pg

import * as mysql from 'mysql2/promise';
import { IDatabaseDriver } from './IDatabaseDriver';
import { ColumnItem } from '../../tree/ColumnItem';


export class MySQLDriver implements IDatabaseDriver {
    private connection!: mysql.Connection;

    constructor(
        private host: string,
        private user: string,
        private password: string,
        private database: string
    ) { }

    async connect(): Promise<void> {
        this.connection = await mysql.createConnection({
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database,
        });
    }

    async close(): Promise<void> {
        if (this.connection) {
            await this.connection.end();
        }
    }

    async executeQuery(query: string): Promise<any> {
        try {
            const [rows] = await this.connection.query(query);
            return { success: true, result: rows };
        } catch (error: any) {
            return { success: false, result: error.message };
        }
    }

    // Métodos mínimos (pode melhorar depois)
    async getTables(): Promise<string[]> {
        const [rows] = await this.connection.query("SHOW TABLES");
        return (rows as any[]).map(row => Object.values(row)[0] as string);
    }

    async getColumns(tableName: string): Promise<ColumnItem[]> {
        const [rows] = await this.connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
        return (rows as any[]).map(row => new ColumnItem(
            row.Field,
            row.Type,
            null,
            null,
            row.Default,
            row.Null === 'YES',
            row.Key === 'PRI'
        ));
    }

    async getAllRows(tableName: string): Promise<any[]> {
        const [rows] = await this.connection.query(`SELECT * FROM \`${tableName}\``);
        return rows as any[];
    }

    async insertRow(tableName: string, data: any): Promise<void> {
        await this.connection.query(`INSERT INTO \`${tableName}\` SET ?`, [data]);
    }

    async updateRow(table: string, data: Record<string, any> | Record<string, any>[]): Promise<number> {
        return 0;
    }

    async updateRows(table: string, data: Record<string, any> | Record<string, any>[]): Promise<number> {
        return 0;
    }

    async deleteRow(tableName: string, primaryKeyValue: any): Promise<void> {
        await this.connection.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [primaryKeyValue]);
    }
}
