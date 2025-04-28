import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { IDatabaseDriver } from './IDatabaseDriver';
import { ColumnItem } from '../../tree/ColumnItem';

export class SQLiteDriver implements IDatabaseDriver {
    private dbPath: string;
    private db!: Database;

    constructor(dbPath: string) {
        this.dbPath = dbPath;
    }

    async connect() {
        this.db = await open({ filename: this.dbPath, driver: sqlite3.Database });
    }

    async getTables(): Promise<string[]> {
        const rows = await this.db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
        return rows.map(row => row.name);
    }

    async getColumns(table: string): Promise<ColumnItem[]> {
        const rows = await this.db.all(`PRAGMA table_info(${table})`);
        return rows.map(r => new ColumnItem(
            r.name,
            r.type,
            r.length ?? null,
            null,
            r.dflt_value,
            r.notnull === 1,
            r.pk === 1,
            r.unique === 1,
            r.pk === 1 && r.type === 'INTEGER' && r.dflt_value === 'AUTOINCREMENT'
        ));
    }

    async getAllRows(table: string, searchText?: string, column?: string): Promise<any[]> {
        let sql = `SELECT * FROM ${table} `;
        const params: any[] = [];

        if (column && searchText) {
            sql += `WHERE ${column} LIKE ?`;
            params.push(`%${searchText}%`);
        }

        sql += ` LIMIT 10`;
        return this.db.all(sql, params);
        // return this.db.all(`SELECT * FROM ${table}`);
    }


    async insertRow(table: string, row: Record<string, any>) {
        const keys = Object.keys(row);
        const values = keys.map(k => row[k]);
        const placeholders = keys.map(() => '?').join(', ');
        await this.db.run(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
    }

    async updateRow(table: string, primaryKeyColumn: string, primaryKeyValue: any, row: Record<string, any>) {

        const sets = Object.keys(row).map(key => `${key} = ?`).join(', ');
        const values = Object.values(row);

        values.push(primaryKeyValue);

        const sql = `UPDATE ${table} SET ${sets} WHERE ${primaryKeyColumn} = ?`;

        await this.db.run(sql, values);
    }

    async deleteRow(tableName: string, primaryKeyColumn: string, primaryKeyValue: any): Promise<void> {
        const sql = `DELETE FROM ${tableName} WHERE ${primaryKeyColumn} = ?`;
        await this.db.run(sql, [primaryKeyValue]);
    }

    async close(): Promise<void> {
        await this.db.close();
    }

    async executeQuery(query: string): Promise<any> {

        try {
            const result = await this.db.all(query);
            return { success: true, result };
        } catch (errorAll) {
            try {
                await this.db.run(query);
                return { success: true, result: 'Query executada com sucesso.' };
            } catch (errorRun) {
                return { success: false, result: (errorRun as any).message || 'Erro desconhecido ao executar a query.' };
            }
        }
    }
}
