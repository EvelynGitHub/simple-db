import { ColumnItem } from "../../tree/ColumnItem";

export type QueryResult = {
    success: boolean,
    type?: string,
    result: any[] | {} | string | undefined
};


export interface IDatabaseDriver {
    connect(): Promise<void>;
    close(): Promise<void>;

    getTables(): Promise<string[]>;
    getColumns(table: string): Promise<ColumnItem[]>;
    getAllRows(table: string, limit: number, offset: number, searchText?: string, column?: string): Promise<{ rows: any[]; total: number }>;

    insertRow(table: string, row: Record<string, any>): Promise<void>;
    updateRow(table: string, data: Record<string, any> | Record<string, any>[], keys: any): Promise<number>;
    updateRows(table: string, updates: { data: Record<string, any>, originalKeys: Record<string, any> }[]): Promise<number>;
    deleteRow(tableName: string, primaryKeyColumn: string, primaryKeyValue: any): Promise<void>;

    /** Novo método para execução de queries livres */
    executeQuery(query: string): Promise<QueryResult>;
}
