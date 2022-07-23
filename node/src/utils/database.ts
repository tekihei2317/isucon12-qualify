import mysql from 'mysql2/promise'
import { open, Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import path from 'path'
import { useSqliteTraceHook } from './../sqltrace'
import { getEnv } from './'

const dbConfig = {
  host: process.env['ISUCON_DB_HOST'] ?? '127.0.0.1',
  port: Number(process.env['ISUCON_DB_PORT'] ?? 3306),
  user: process.env['ISUCON_DB_USER'] ?? 'isucon',
  password: process.env['ISUCON_DB_PASSWORD'] ?? 'isucon',
  database: process.env['ISUCON_DB_NAME'] ?? 'isucon_listen80',
}

export const adminDB = mysql.createPool(dbConfig)

// テナントDBのパスを返す
function tenantDBPath(id: number): string {
  const tenantDBDir = getEnv('ISUCON_TENANT_DB_DIR', '../tenant_db')
  return path.join(tenantDBDir, `${id.toString()}.db`)
}

// テナントDBに接続する
export async function connectToTenantDB(id: number): Promise<Database> {
  const p = tenantDBPath(id)
  let db: Database
  try {
    db = await open({
      filename: p,
      driver: sqlite3.Database,
    })
    db.configure('busyTimeout', 5000)

    const traceFilePath = getEnv('ISUCON_SQLITE_TRACE_FILE', '')
    if (traceFilePath) {
      db = useSqliteTraceHook(db, traceFilePath)
    }
  } catch (error) {
    throw new Error(`failed to open tenant DB: ${error}`)
  }

  return db
}