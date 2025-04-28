import { ColumnItem } from "../../tree/ColumnItem";

export interface IDatabaseDriver {
    connect(): Promise<void>;
    close(): Promise<void>;

    getTables(): Promise<string[]>;
    getColumns(table: string): Promise<ColumnItem[]>;
    getAllRows(table: string, searchText?: string, column?: string): Promise<any[]>;

    insertRow(table: string, row: Record<string, any>): Promise<void>;
    updateRow(table: string, primaryKeyColumn: string, primaryKeyValue: any, row: Record<string, any>): Promise<void>;
    deleteRow(tableName: string, primaryKeyColumn: string, primaryKeyValue: any): Promise<void>;

    /** Novo método para execução de queries livres */
    executeQuery(query: string): Promise<any>;
}
