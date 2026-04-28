import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

/** Retorna a instância do banco SQLite local, inicializando se necessário. */
export async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await Database.load("sqlite:pdv.db");
  await migrarSchema(_db);
  return _db;
}

async function migrarSchema(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS produtos_cache (
      id INTEGER PRIMARY KEY,
      descricao TEXT NOT NULL,
      preco_venda REAL NOT NULL,
      codigo_barras TEXT,
      unidade_medida TEXT,
      tipo TEXT,
      controla_estoque TEXT,
      ativo TEXT,
      dt_sync TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS formas_pagamento_cache (
      id INTEGER PRIMARY KEY,
      descricao TEXT NOT NULL,
      tipo TEXT,
      dt_sync TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS venda_offline_queue (
      id TEXT PRIMARY KEY,
      dt_venda TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      erro TEXT,
      dt_criacao TEXT NOT NULL,
      dt_sync TEXT
    )
  `);
}

/** Remove todas as instâncias cacheadas (útil em testes). */
export function _resetDb(): void {
  _db = null;
}
