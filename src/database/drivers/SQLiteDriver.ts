import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { IDatabaseDriver, QueryResult } from './IDatabaseDriver';
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
            r.pk > 0,
            r.unique === 1,
            r.pk > 0 && r.type === 'INTEGER' && r.dflt_value === 'AUTOINCREMENT'
        ));
    }

    async getRowsPage(table: string, limit: number, offset: number): Promise<{ rows: any[]; total: number }> {

        const [{ count }] = await this.db.all<{ count: number }[]>(
            `SELECT COUNT(*) AS count FROM ${table}`
        );
        const rows = await this.db.all(
            `SELECT * FROM ${table} LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return { rows, total: count };
    }

    async getAllRows(table: string, limit: number, offset: number, searchText?: string, column?: string): Promise<{ rows: any[]; total: number }> {
        const params: any[] = [];
        let where = "";

        if (column && searchText) {
            where = `WHERE ${column} LIKE ?`;
            params.push(`%${searchText}%`);
        }

        const [{ count }] = await this.db.all<{ count: number }[]>(
            `SELECT COUNT(*) AS count FROM ${table} ${where}`, params
        );

        let sql = `SELECT * FROM ${table} ${where} LIMIT ? OFFSET ?`;

        params.push(limit);
        params.push(offset);
        const rows = await this.db.all(sql, params);

        return { rows, total: count };
        // return this.db.all(`SELECT * FROM ${table}`);
    }


    async insertRow(table: string, data: Record<string, any> | Record<string, any>[]) {
        const rows = Array.isArray(data) ? data : [data];

        if (rows.length === 0) return;

        const keys = Object.keys(rows[0]);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

        await this.db.run('BEGIN TRANSACTION');
        try {
            const stmt = await this.db.prepare(sql);

            for (const row of rows) {
                const values = keys.map(k => row[k]);
                await stmt.run(values);
            }

            await stmt.finalize(); // Libera o statement preparado
            await this.db.run('COMMIT');
        } catch (error) {
            await this.db.run('ROLLBACK');
            throw error;
        }
    }

    async updateRow(table: string, data: Record<string, any> | Record<string, any>[], keys: any): Promise<number> {

        const columnsToUpdate = Object.keys(data);
        const valuesToUpdate = Object.values(data);

        const whereColumns = Object.keys(keys);
        const whereValues = Object.values(keys);

        // Monta os SETs e WHEREs com placeholders
        const setClause = columnsToUpdate.map(col => `${col} = ?`).join(', ');
        const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');

        // Monta a query final
        const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

        // Junta os valores na ordem correta: primeiro os do SET, depois os do WHERE
        const values = [...valuesToUpdate, ...whereValues];

        // Executa a query preparada
        this.db.run(query, ...values);
        return 1;
    }

    async updateRows(table: string, updates: { data: Record<string, any>, originalKeys: Record<string, any> }[]): Promise<number> {
        if (!Array.isArray(updates) || updates.length === 0) return 0;

        const first = updates[0];
        const allColumns = Object.keys(first.data);
        const whereColumns = Object.keys(first.originalKeys);

        const setClause = allColumns.map(col => `${col} = ?`).join(', ');
        const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

        let totalUpdated = 0;

        await this.db.run('BEGIN TRANSACTION');
        try {
            const stmt = await this.db.prepare(sql);

            for (const { data, originalKeys } of updates) {
                const values = [...allColumns.map(c => data[c]), ...whereColumns.map(c => originalKeys[c])];
                const result = await stmt.run(values);
                totalUpdated += result.changes ?? 0;
            }

            await stmt.finalize();
            await this.db.run('COMMIT');
        } catch (error) {
            await this.db.run('ROLLBACK');
            throw error;
        }

        return totalUpdated;
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
