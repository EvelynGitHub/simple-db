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

    // async updateRow(table: string, primaryKeyColumn: string, primaryKeyValue: any, row: Record<string, any>) {

    //     const sets = Object.keys(row).map(key => `${key} = ?`).join(', ');
    //     const values = Object.values(row);

    //     values.push(primaryKeyValue);

    //     const sql = `UPDATE ${table} SET ${sets} WHERE ${primaryKeyColumn} = ?`;

    //     await this.db.run(sql, values);
    // }

    async updateRow(table: string, data: Record<string, any> | Record<string, any>[]): Promise<number> {
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) return 0;

        // Detecta as chaves primárias da tabela
        const pragma = await this.db.all(`PRAGMA table_info(${table})`);
        const pkColumns = pragma.filter(col => col.pk > 0).sort((a, b) => a.pk - b.pk).map(col => col.name);

        if (pkColumns.length === 0) {
            throw new Error(`Não foi possível encontrar a chave primária da tabela "${table}".`);
        }

        const sample = rows[0];
        const keys = Object.keys(sample).filter(k => !pkColumns.includes(k));
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const whereClause = pkColumns.map(k => `${k} = ?`).join(' AND ');
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

        let totalUpdated = 0;

        await this.db.run('BEGIN TRANSACTION');
        try {
            const stmt = await this.db.prepare(sql);

            for (const row of rows) {
                const setValues = keys.map(k => row[k]);
                const whereValues = pkColumns.map(k => row[k]);
                const result = await stmt.run([...setValues, ...whereValues]);
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
