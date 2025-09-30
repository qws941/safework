/**
 * D1 Database Client
 * Native Cloudflare D1 connection and query layer
 */

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * D1 Client Wrapper
 * Provides utility methods for database operations
 */
export class D1Client {
  constructor(private db: D1Database) {}

  /**
   * Execute a single query
   */
  async query<T = unknown>(
    sql: string,
    ...params: unknown[]
  ): Promise<D1Result<T>> {
    let stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt = stmt.bind(...params);
    }
    return await stmt.all<T>();
  }

  /**
   * Execute a query and return first result
   */
  async queryFirst<T = unknown>(
    sql: string,
    ...params: unknown[]
  ): Promise<T | null> {
    let stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt = stmt.bind(...params);
    }
    return await stmt.first<T>();
  }

  /**
   * Execute a mutation (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, ...params: unknown[]): Promise<D1Result> {
    let stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt = stmt.bind(...params);
    }
    return await stmt.run();
  }

  /**
   * Execute multiple statements in a transaction
   */
  async transaction(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    return await this.db.batch(statements);
  }

  /**
   * Insert a single record and return its ID
   */
  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<number | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.execute(sql, ...values);

    if (result.success) {
      // Get last inserted ID
      const lastId = await this.queryFirst<{ id: number }>(
        'SELECT last_insert_rowid() as id'
      );
      return lastId?.id || null;
    }

    return null;
  }

  /**
   * Update records
   */
  async update(
    table: string,
    data: Record<string, unknown>,
    where: string,
    ...whereParams: unknown[]
  ): Promise<boolean> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    const result = await this.execute(sql, ...values, ...whereParams);

    return result.success;
  }

  /**
   * Delete records
   */
  async delete(
    table: string,
    where: string,
    ...whereParams: unknown[]
  ): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    const result = await this.execute(sql, ...whereParams);

    return result.success;
  }

  /**
   * Count records
   */
  async count(table: string, where?: string, ...whereParams: unknown[]): Promise<number> {
    const sql = where
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;

    const result = await this.queryFirst<{ count: number }>(sql, ...whereParams);
    return result?.count || 0;
  }

  /**
   * Check if record exists
   */
  async exists(table: string, where: string, ...whereParams: unknown[]): Promise<boolean> {
    const count = await this.count(table, where, ...whereParams);
    return count > 0;
  }
}

/**
 * Create D1 client instance
 */
export function createD1Client(db: D1Database): D1Client {
  return new D1Client(db);
}