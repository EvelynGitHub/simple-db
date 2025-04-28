// Banco | Precisa instalar
// MySQL | npm install mysql2
// PostgreSQL | npm install pg


import { Client } from 'pg';
import { IDatabaseDriver } from './IDatabaseDriver';
import { ColumnItem } from '../../tree/ColumnItem';

export class PostgresDriver implements IDatabaseDriver {
    private client!: Client;

    constructor(
        private host: string,
        private user: string,
        private password: string,
        private database: string
    ) { }

    async connect(): Promise<void> {
        this.client = new Client({
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database,
        });
        await this.client.connect();
    }

    async close(): Promise<void> {
        if (this.client) {
            await this.client.end();
        }
    }

    async executeQuery(query: string): Promise<any> {
        try {
            const result = await this.client.query(query);
            return { success: true, result: result.rows };
        } catch (error: any) {
            return { success: false, result: error.message };
        }
    }

    async getTables(): Promise<string[]> {
        const result = await this.client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        return result.rows.map((row: { table_name: any; }) => row.table_name);
    }

    async getColumns(tableName: string): Promise<ColumnItem[]> {
        const result = await this.client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1;
            `, [tableName]);
        return result.rows.map((row: { column_name: string; data_type: string }) => new ColumnItem(
            row.column_name,
            row.data_type
        ));
    }

    async getAllRows(tableName: string): Promise<any[]> {
        const result = await this.client.query(`SELECT * FROM "${tableName}"`);
        return result.rows;
    }

    async insertRow(tableName: string, data: any): Promise<void> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, index) => `$${index + 1}`).join(',');

        await this.client.query(
            `INSERT INTO "${tableName}" (${keys.join(',')}) VALUES (${placeholders})`,
            values
        );
    }

    async updateRow(tableName: string, primaryKey: string, data: any): Promise<void> {
        const id = data[primaryKey];
        delete data[primaryKey];

        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, index) => `"${key}" = $${index + 1}`).join(',');

        await this.client.query(
            `UPDATE "${tableName}" SET ${setClause} WHERE "${primaryKey}" = $${keys.length + 1}`,
            [...values, id]
        );
    }

    async deleteRow(tableName: string, primaryKeyValue: any): Promise<void> {
        await this.client.query(`DELETE FROM "${tableName}" WHERE id = $1`, [primaryKeyValue]);
    }
}
