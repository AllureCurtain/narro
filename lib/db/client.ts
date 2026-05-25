import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { schema } from "./schema";

export interface NarroDatabase {
  client: Client;
  db: LibSQLDatabase<typeof schema>;
  url: string;
}

let singleton: NarroDatabase | null = null;

export function getDatabaseUrl() {
  return process.env.NARRO_DB_URL ?? `file:${path.join(process.cwd(), "data", "narro.db")}`;
}

export function createDatabase(url = getDatabaseUrl()): NarroDatabase {
  ensureLocalDatabaseDirectory(url);

  const client = createClient({ url });
  return {
    client,
    db: drizzle(client, { schema }),
    url
  };
}

export function getDatabase(): NarroDatabase {
  singleton ??= createDatabase();
  return singleton;
}

export async function closeDatabase(database = singleton) {
  await database?.client.close();
  if (database === singleton) singleton = null;
}

export async function initializeDatabase(database = getDatabase()) {
  await database.client.execute(`
    create table if not exists sources (
      id text primary key,
      name text not null,
      type text not null,
      url text not null,
      group_name text not null,
      enabled integer not null default 1,
      refresh_interval_minutes integer not null,
      last_fetched_at text not null default '',
      failure_count integer not null default 0,
      last_error text not null default '',
      average_latency_ms integer not null default 0,
      tags_json text not null default '[]',
      entities_json text not null default '[]',
      created_at text not null,
      updated_at text not null
    )
  `);

  await database.client.execute(`
    create table if not exists settings (
      key text primary key,
      value text not null,
      created_at text not null,
      updated_at text not null
    )
  `);

  await ensureColumn(database, "sources", "last_error", "text not null default ''");
  await ensureColumn(database, "sources", "average_latency_ms", "integer not null default 0");

  await database.client.execute(`
    create table if not exists items (
      id text primary key,
      source_id text not null,
      external_id text not null,
      title text not null,
      url text not null unique,
      author text not null,
      published_at text not null,
      fetched_at text not null,
      summary text not null,
      ai_summary text not null default '',
      language text not null,
      tags_json text not null default '[]',
      entities_json text not null default '[]',
      importance_score integer not null default 50,
      duplicate_group_id text,
      read_status text not null default 'unread',
      saved integer not null default 0,
      hidden integer not null default 0,
      event_group_id text,
      reason text not null,
      created_at text not null,
      updated_at text not null
    )
  `);

  await database.client.execute(`
    create table if not exists lenses (
      id text primary key,
      name text not null,
      description text not null,
      source_group_filters_json text not null default '[]',
      keyword_filters_json text not null default '[]',
      entity_filters_json text not null default '[]',
      tag_filters_json text not null default '[]',
      ranking_mode text not null default 'latest',
      created_at text not null,
      updated_at text not null
    )
  `);

  await database.client.execute(`
    create table if not exists agent_tasks (
      id text primary key,
      type text not null,
      lens_id text,
      item_id text,
      status text not null,
      input text not null,
      output text not null default '',
      error text not null default '',
      created_at text not null,
      updated_at text not null
    )
  `);

  await database.client.execute(`
    create table if not exists refresh_logs (
      id text primary key,
      source_id text not null,
      ok integer not null,
      fetched_count integer not null default 0,
      inserted_count integer not null default 0,
      latency_ms integer not null default 0,
      error text not null default '',
      created_at text not null
    )
  `);

  await database.client.execute("create index if not exists idx_items_source_id on items(source_id)");
  await database.client.execute("create index if not exists idx_items_published_at on items(published_at)");
  await database.client.execute("create index if not exists idx_sources_enabled on sources(enabled)");
  await database.client.execute("create index if not exists idx_agent_tasks_lens_id on agent_tasks(lens_id)");
  await database.client.execute("create index if not exists idx_agent_tasks_updated_at on agent_tasks(updated_at)");
  await database.client.execute("create index if not exists idx_settings_updated_at on settings(updated_at)");
  await database.client.execute("create index if not exists idx_refresh_logs_created_at on refresh_logs(created_at)");
  await database.client.execute("create index if not exists idx_refresh_logs_source_id on refresh_logs(source_id)");
}

export async function resetDatabase(database = getDatabase()) {
  await database.client.execute("drop table if exists refresh_logs");
  await database.client.execute("drop table if exists settings");
  await database.client.execute("drop table if exists agent_tasks");
  await database.client.execute("drop table if exists items");
  await database.client.execute("drop table if exists lenses");
  await database.client.execute("drop table if exists sources");
}

async function ensureColumn(database: NarroDatabase, table: string, column: string, definition: string) {
  const existing = await database.client.execute(`pragma table_info(${table})`);
  const hasColumn = existing.rows.some((row) => row.name === column);
  if (!hasColumn) {
    await database.client.execute(`alter table ${table} add column ${column} ${definition}`);
  }
}

function ensureLocalDatabaseDirectory(url: string) {
  if (url === "file::memory:" || !url.startsWith("file:")) return;

  const filePath = url.slice("file:".length);
  const directory = path.dirname(filePath);
  mkdirSync(directory, { recursive: true });
}
