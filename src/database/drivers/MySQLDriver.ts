import mysql from 'mysql2/promise';
import { IDatabaseDriver, QueryResult } from './IDatabaseDriver';
import { ColumnItem } from '../../tree/ColumnItem';
import { ConnectionConfig } from '../ConnectionManager';

export class MySQLDriver implements IDatabaseDriver {
    private connection!: mysql.Connection;
    private config = {}

    constructor(config: ConnectionConfig) {
        const { type, name, ...cleanOptions } = config; // remove 'type' que não é usado por Mysql
        this.config = cleanOptions;
    }

    async connect(): Promise<void> {
        this.connection = await mysql.createConnection(this.config);
    }

    async close(): Promise<void> {
        await this.connection.end();
    }

    async getTables(): Promise<string[]> {
        const [rows]: any[] = await this.connection.query(`SHOW TABLES`);
        return Object.values(rows.map((row: any) => Object.values(row)[0]));
    }

    async getColumns(table: string): Promise<ColumnItem[]> {
        const [rows] = await this.connection.query(`SHOW COLUMNS FROM \`${table}\``);
        return (rows as any[]).map(row => new ColumnItem(
            row.Field,
            row.Type,
            null,
            row.Extra,
            row.Default,
            row.Null === 'NO',
            row.Key === 'PRI',
            row.Key === 'UNI',
            row.Extra.includes('auto_increment')
        ));
    }

    async getAllRows(table: string, limit: number, offset: number, searchText?: string, column?: string): Promise<{ rows: any[]; total: number }> {
        const params: any[] = [];
        let where = '';

        if (column && searchText) {
            where = `WHERE \`${column}\` LIKE ?`;
            params.push(`%${searchText}%`);
        }

        const [rowsCount]: any[] = await this.connection.query(`SELECT COUNT(*) as count FROM \`${table}\` ${where}`, params);
        const count = rowsCount[0]?.count ?? 0;
        const [rows]: any[] = await this.connection.query(`SELECT * FROM \`${table}\` ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return { rows, total: count };
    }

    async insertRow(table: string, data: Record<string, any> | Record<string, any>[]): Promise<void> {
        const rows = Array.isArray(data) ? data : [data];
        if (!rows.length) return;

        const keys = Object.keys(rows[0]);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${table}\` (${keys.join(', ')}) VALUES (${placeholders})`;

        const connection = this.connection;
        await connection.beginTransaction();
        try {
            for (const row of rows) {
                const values = keys.map(k => row[k]);
                await connection.query(sql, values);
            }
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        }
    }

    async updateRow(table: string, data: Record<string, any> | Record<string, any>[], keys: any): Promise<number> {
        return this.updateRows(table, [{ data, originalKeys: keys }]);
    }

    async updateRows(table: string, updates: { data: Record<string, any>, originalKeys: Record<string, any> }[]): Promise<number> {
        let updated = 0;

        for (const { data, originalKeys } of updates) {
            const setClause = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
            const whereClause = Object.keys(originalKeys).map(k => `\`${k}\` = ?`).join(' AND ');
            const values = [...Object.values(data), ...Object.values(originalKeys)];
            const [result] = await this.connection.query(`UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`, values);
            updated += (result as any).affectedRows;
        }

        return updated;
    }

    async deleteRow(table: string, primaryKeyColumn: string, primaryKeyValue: any): Promise<void> {
        await this.connection.query(`DELETE FROM \`${table}\` WHERE \`${primaryKeyColumn}\` = ?`, [primaryKeyValue]);
    }

    async executeQuery(query: string): Promise<QueryResult> {
        try {
            const [rows] = await this.connection.query(query);
            return { success: true, result: rows };
        } catch (err: any) {
            return { success: false, result: err.message };
        }
    }
}
