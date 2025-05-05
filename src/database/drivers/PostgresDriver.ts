import { Client } from 'pg';
import { IDatabaseDriver, QueryResult } from './IDatabaseDriver';
import { ColumnItem } from '../../tree/ColumnItem';

export class PostgresDriver implements IDatabaseDriver {
    private client: Client;

    constructor(config: any) {
        this.client = new Client(config);
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async close(): Promise<void> {
        await this.client.end();
    }

    async getTables(): Promise<string[]> {
        const res = await this.client.query(`
            SELECT tablename FROM pg_tables WHERE schemaname='public'
        `);
        return res.rows.map(row => row.tablename);
    }

    async getColumns(table: string): Promise<ColumnItem[]> {
        const res = await this.client.query(`WITH table_info AS (
                SELECT
                    c.oid AS table_oid
                FROM pg_class c
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE c.relname = $1
                AND n.nspname = 'public'
            ),
            primary_keys AS (
                SELECT
                    i.indrelid,
                    unnest(i.indkey) AS attnum
                FROM pg_index i
                WHERE i.indisprimary
            ),
            unique_keys AS (
                SELECT
                    i.indrelid,
                    unnest(i.indkey) AS attnum
                FROM pg_index i
                WHERE i.indisunique AND NOT i.indisprimary
            ),
            foreign_keys AS (
                SELECT
                    c.conrelid,
                    unnest(c.conkey) AS attnum
                FROM pg_constraint c
                WHERE c.contype = 'f'
            )
            SELECT
                a.attname AS column_name,
                format_type(a.atttypid, a.atttypmod) AS data_type,
                NOT a.attnotnull AS is_nullable,
                pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
                col_description(a.attrelid, a.attnum) AS comment,
                (pk.attnum IS NOT NULL) AS is_primary_key,
                (uk.attnum IS NOT NULL) AS is_unique,
                (fk.attnum IS NOT NULL) AS is_foreign_key
            FROM pg_attribute a
            JOIN table_info t ON a.attrelid = t.table_oid
            LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
            LEFT JOIN primary_keys pk ON pk.indrelid = a.attrelid AND pk.attnum = a.attnum
            LEFT JOIN unique_keys uk ON uk.indrelid = a.attrelid AND uk.attnum = a.attnum
            LEFT JOIN foreign_keys fk ON fk.conrelid = a.attrelid AND fk.attnum = a.attnum
            WHERE a.attnum > 0 AND NOT a.attisdropped
            ORDER BY a.attnum;
        `, [table]);

        return res.rows.map(row => new ColumnItem(
            row.column_name,
            row.data_type,
            null,
            row.comment,
            row.column_default,
            row.is_nullable,
            row.is_primary_key,
            row.is_unique,
            false,
            row.is_foreign_key
        ));
    }

    async getRowsPage(table: string, limit: number, offset: number) {
        const countRes = await this.client.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(countRes.rows[0].count, 10);

        const dataRes = await this.client.query(`SELECT * FROM "${table}" LIMIT $1 OFFSET $2`, [limit, offset]);
        return { rows: dataRes.rows, total: count };
    }

    async getAllRows(table: string, limit: number, offset: number, searchText?: string, column?: string) {
        let where = '';
        const params: any[] = [];

        if (column && searchText) {
            where = `WHERE "${column}" ILIKE $1`;
            params.push(`%${searchText}%`);
        }

        const countRes = await this.client.query(`SELECT COUNT(*) FROM "${table}" ${where}`, params);
        const count = parseInt(countRes.rows[0].count, 10);

        params.push(limit, offset);
        const dataRes = await this.client.query(`SELECT * FROM "${table}" ${where} LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        return { rows: dataRes.rows, total: count };
    }

    async insertRow(table: string, data: Record<string, any>): Promise<void> {
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) return;

        // Remove chaves com valor null/undefined (como 'id') em cada linha
        const cleanedRows = rows.map(row =>
            Object.fromEntries(Object.entries(row).filter(([_, value]) => value !== null && value !== undefined))
        );

        const keys = Object.keys(cleanedRows[0]);

        const placeholders = cleanedRows.map((row, rowIndex) =>
            `(${keys.map((_, colIndex) => `$${rowIndex * keys.length + colIndex + 1}`).join(', ')})`
        );

        const values = cleanedRows.flatMap(row => keys.map(k => row[k]));

        const query = `
          INSERT INTO "${table}" (${keys.join(', ')})
          VALUES ${placeholders.join(', ')}
          RETURNING *;
        `;

        await this.client.query(query, values);
    }

    async updateRow(table: string, data: Record<string, any>, keys: any): Promise<number> {
        return this.updateRows(table, [{ data, originalKeys: keys }]);
    }

    async updateRows(table: string, updates: { data: Record<string, any>, originalKeys: Record<string, any> }[]): Promise<number> {
        // let updated = 0;

        // for (const { data, originalKeys } of updates) {
        //     const set = Object.keys(data).map((k, i) => `"${k}" = $${i + 1}`);
        //     const where = Object.keys(originalKeys).map((k, i) => `"${k}" = $${i + 1 + set.length}`);
        //     const values = [...Object.values(data), ...Object.values(originalKeys)];

        //     const res = await this.client.query(`UPDATE "${table}" SET ${set.join(', ')} WHERE ${where.join(' AND ')}`, values);
        //     updated += res.rowCount ?? 0;
        // }

        // return updated;
        let updated = 0;

        for (const { data, originalKeys } of updates) {
            // Evita tentar atualizar campos usados como identificadores (como o id)
            const safeData = Object.fromEntries(
                Object.entries(data).filter(([key]) => !(key in originalKeys))
            );

            if (Object.keys(safeData).length === 0) continue; // Nada para atualizar

            const set = Object.keys(safeData).map((k, i) => `"${k}" = $${i + 1}`);
            const where = Object.keys(originalKeys).map((k, i) => `"${k}" = $${i + 1 + set.length}`);
            const values = [...Object.values(safeData), ...Object.values(originalKeys)];

            const query = `UPDATE "${table}" SET ${set.join(', ')} WHERE ${where.join(' AND ')}`;
            const res = await this.client.query(query, values);
            updated += res.rowCount ?? 0;
        }

        return updated;
    }

    async deleteRow(table: string, primaryKeyColumn: string, primaryKeyValue: any): Promise<void> {
        await this.client.query(`DELETE FROM "${table}" WHERE "${primaryKeyColumn}" = $1`, [primaryKeyValue]);
    }

    async executeQuery(query: string): Promise<QueryResult> {
        try {
            const result = await this.client.query(query);
            return { success: true, result: result.rows };
        } catch (err: any) {
            return { success: false, result: err.message };
        }
    }
}
