#!/usr/bin/env ts-node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           SUPABASE DATABASE BACKUP & RESTORE             ║
 * ║   Modes: COMPLET · INCRÉMENTAL · SMART                  ║
 * ║   Couvre: Tables · Colonnes · Views · Materialized Views ║
 * ║           Fonctions · Triggers · Séquences · Types       ║
 * ║           Index · Extensions                             ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import * as dotenv from "dotenv";
import { Client } from "pg";
import type { QueryResult } from "pg";

dotenv.config();

const execAsync = promisify(exec);

// ─── ANSI Colors ─────────────────────────────────────────────
const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m",
};

const color   = (c: string, t: string) => `${c}${t}${C.reset}`;
const bold    = (t: string) => color(C.bold, t);
const info    = (m: string) => console.log(`  ${color(C.cyan,   "ℹ")}  ${m}`);
const success = (m: string) => console.log(`  ${color(C.green,  "✔")}  ${m}`);
const warn    = (m: string) => console.log(`  ${color(C.yellow, "⚠")}  ${m}`);
const error   = (m: string) => console.log(`  ${color(C.red,    "✖")}  ${m}`);
const step    = (n: number, total: number, m: string) =>
  console.log(`\n  ${color(C.blue, `[${n}/${total}]`)} ${bold(m)}`);

// ─── Types ────────────────────────────────────────────────────
type Environment = "TEST" | "PROD";
type Operation   = "BACKUP" | "RESTORE";
type RestoreMode = "COMPLET" | "INCREMENTAL" | "SMART";

interface DbConfig {
  host: string; port: string; database: string; user: string; password: string;
}

interface ColumnInfo {
  column_name: string; data_type: string; is_nullable: string; column_default: string | null;
}

interface FunctionInfo {
  name: string; arguments: string; returnType: string; language: string;
}

interface TriggerInfo {
  name: string; table_name: string; timing: string; events: string;
}

interface SequenceInfo {
  name: string; start: string; increment: string;
}

interface TypeInfo {
  name: string; kind: string;
}

interface RlsPolicyInfo {
  /** Unique key: "tablename.policyname" */
  key:        string;
  policyname: string;
  tablename:  string;
  cmd:        string;   // SELECT | INSERT | UPDATE | DELETE | ALL
  permissive: string;   // PERMISSIVE | RESTRICTIVE
  roles:      string;
  qual:       string;   // USING expression
  with_check: string;   // WITH CHECK expression
}

/** Complete snapshot of all database objects */
interface FullSchemaInfo {
  tables:     string[];
  columns:    Record<string, ColumnInfo[]>;
  views:      string[];
  viewDefs:   Record<string, string>;
  matViews:   string[];
  matViewDefs:Record<string, string>;
  functions:  FunctionInfo[];
  triggers:   TriggerInfo[];
  sequences:  SequenceInfo[];
  types:      TypeInfo[];
  indexes:    string[];
  extensions: string[];
  rlsPolicies:RlsPolicyInfo[];
  rlsEnabled: string[];   // table names with RLS enabled
}

interface SchemaDiff {
  // Tables / Columns
  missingTables:     string[];
  extraTables:       string[];
  missingColumns:    Record<string, string[]>;
  extraColumns:      Record<string, string[]>;
  // Views
  missingViews:      string[];
  extraViews:        string[];
  changedViews:      string[];
  // Mat. Views
  missingMatViews:   string[];
  extraMatViews:     string[];
  changedMatViews:   string[];
  // Functions
  missingFunctions:  string[];
  extraFunctions:    string[];
  // Triggers
  missingTriggers:   string[];
  extraTriggers:     string[];
  // Sequences
  missingSequences:  string[];
  extraSequences:    string[];
  // Types
  missingTypes:      string[];
  extraTypes:        string[];
  // Extensions
  missingExtensions: string[];
  extraExtensions:   string[];
  // RLS
  missingPolicies:   string[];   // "table.policy"
  extraPolicies:     string[];
  changedPolicies:   string[];
  missingRlsEnabled: string[];   // tables where RLS should be ON but isn't
  extraRlsEnabled:   string[];   // tables where RLS is ON but backup has it OFF
  // Summary
  totalDiffs:   number;
  targetIsEmpty:boolean;
}

interface SmartAnalysis {
  recommendation: RestoreMode;
  reasons: string[];
  diff:    SchemaDiff;
}

// ─── Config Loader ────────────────────────────────────────────
function loadDbConfig(env: Environment): DbConfig {
  const p = env === "PROD" ? "PROD" : "TEST";

  const directUrl =
    process.env[`${p}_DATABASE_URL`] ||
    process.env[`${p}_SUPABASE_DB_URL`] ||
    process.env[`${p}_DB_URL`];

  if (directUrl) {
    const u = new URL(directUrl);
    return {
      host: u.hostname, port: u.port || "5432",
      database: u.pathname.replace("/", ""),
      user: u.username, password: u.password,
    };
  }

  const host     = process.env[`${p}_DB_HOST`]     || process.env[`${p}_SUPABASE_HOST`];
  const port     = process.env[`${p}_DB_PORT`]     || "5432";
  const database = process.env[`${p}_DB_NAME`]     || process.env[`${p}_DB_DATABASE`] || "postgres";
  const user     = process.env[`${p}_DB_USER`]     || process.env[`${p}_DB_USERNAME`];
  const password = process.env[`${p}_DB_PASSWORD`] || process.env[`${p}_DB_PASS`];

  if (!host || !user || !password)
    throw new Error(
      `Variables manquantes dans .env pour ${env}.\n` +
      `Attendu: ${p}_DB_HOST, ${p}_DB_USER, ${p}_DB_PASSWORD  ou  ${p}_DATABASE_URL`
    );

  return { host, port, database, user, password };
}

// ─── Readline ─────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((r) => rl.question(q, r));

async function askChoice<T extends string>(
  question: string,
  choices: { key: string; label: string; value: T; description?: string }[]
): Promise<T> {
  console.log(`\n  ${bold(question)}\n`);
  choices.forEach((c) => {
    const desc = c.description ? color(C.dim, `  — ${c.description}`) : "";
    console.log(`    ${color(C.cyan, `[${c.key}]`)} ${c.label}${desc}`);
  });
  while (true) {
    const a = await ask(`\n  Votre choix : `);
    const found = choices.find(
      (c) => c.key.toLowerCase() === a.trim().toLowerCase() ||
             c.value.toLowerCase() === a.trim().toLowerCase()
    );
    if (found) return found.value;
    warn(`Choix invalide. Entrez ${choices.map((c) => c.key).join(", ")}`);
  }
}

async function confirm(message: string): Promise<boolean> {
  const a = await ask(`\n  ${color(C.yellow, "⚠")}  ${message} ${color(C.dim, "[o/N]")} : `);
  return ["o", "oui", "y", "yes"].includes(a.trim().toLowerCase());
}

// ─── Backup Dir ───────────────────────────────────────────────
const BACKUP_DIR = path.join(process.cwd(), "database backup");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    info(`Répertoire créé : ${color(C.cyan, BACKUP_DIR)}`);
  }
}

function getBackupFilename(env: Environment): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  return path.join(BACKUP_DIR, `backup_${env.toLowerCase()}_${ts}.dump`);
}

function listBackupFiles(env?: Environment): string[] {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => (f.endsWith(".dump") || f.endsWith(".sql")) && (!env || f.includes(env.toLowerCase())))
    .map((f) => path.join(BACKUP_DIR, f))
    .sort().reverse();
}

// ─── PG Helpers ───────────────────────────────────────────────
function pgEnvVars(cfg: DbConfig): NodeJS.ProcessEnv {
  return { ...process.env, PGPASSWORD: cfg.password, PGHOST: cfg.host, PGPORT: cfg.port, PGDATABASE: cfg.database, PGUSER: cfg.user };
}

function pgDumpCmd(cfg: DbConfig, outFile: string): string {
  return `pg_dump -h ${cfg.host} -p ${cfg.port} -U ${cfg.user} -d ${cfg.database}` +
         ` --format=custom --compress=9 --no-acl --no-owner -f "${outFile}"`;
}

function pgRestoreCmd(cfg: DbConfig, file: string, flags = ""): string {
  return `pg_restore -h ${cfg.host} -p ${cfg.port} -U ${cfg.user} -d ${cfg.database}` +
         ` --no-acl --no-owner ${flags} "${file}"`;
}

// ─── Format Detection ─────────────────────────────────────────
/**
 * Detect backup file format by reading the magic header.
 * pg_dump custom/directory format starts with bytes "PGDMP".
 * Plain SQL files are text — use psql to restore them.
 * Returns "custom" (→ pg_restore) or "plain" (→ psql).
 */
function detectBackupFormat(file: string): "custom" | "plain" {
  const MAGIC = Buffer.from("PGDMP");
  const fd    = fs.openSync(file, "r");
  const buf   = Buffer.alloc(5);
  fs.readSync(fd, buf, 0, 5, 0);
  fs.closeSync(fd);
  return buf.equals(MAGIC) ? "custom" : "plain";
}

/** psql command for plain SQL files */
function psqlRestoreCmd(cfg: DbConfig, file: string): string {
  return `psql -h ${cfg.host} -p ${cfg.port} -U ${cfg.user} -d ${cfg.database}` +
         ` -v ON_ERROR_STOP=0 -f "${file}"`;
}

/** Read SQL content from a plain .sql backup file */
function readPlainBackupSql(file: string): string {
  return fs.readFileSync(file, "utf-8");
}

function makeClient(cfg: DbConfig) {
  return new Client({
    host: cfg.host, port: parseInt(cfg.port),
    database: cfg.database, user: cfg.user, password: cfg.password,
    ssl: cfg.host.includes("supabase") ? { rejectUnauthorized: false } : false,
  });
}

// ─── Full Schema Inspector (live DB) ─────────────────────────
async function getFullSchema(cfg: DbConfig): Promise<FullSchemaInfo> {
  const client = makeClient(cfg);
  await client.connect();

  // Tables
  const tablesRes: QueryResult = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;`);
  const tables = tablesRes.rows.map((r) => r.table_name as string);

  // Columns
  const columns: Record<string, ColumnInfo[]> = {};
  for (const t of tables) {
    const res: QueryResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;`, [t]);
    columns[t] = res.rows as ColumnInfo[];
  }

  // Views
  const viewsRes: QueryResult = await client.query(`
    SELECT table_name, view_definition FROM information_schema.views
    WHERE table_schema = 'public' ORDER BY table_name;`);
  const views: string[] = [];
  const viewDefs: Record<string, string> = {};
  for (const r of viewsRes.rows) {
    views.push(r.table_name);
    viewDefs[r.table_name] = (r.view_definition || "").trim().toLowerCase();
  }

  // Materialized Views
  const matRes: QueryResult = await client.query(`
    SELECT matviewname, definition FROM pg_matviews
    WHERE schemaname = 'public' ORDER BY matviewname;`);
  const matViews: string[] = [];
  const matViewDefs: Record<string, string> = {};
  for (const r of matRes.rows) {
    matViews.push(r.matviewname);
    matViewDefs[r.matviewname] = (r.definition || "").trim().toLowerCase();
  }

  // Functions & Procedures
  const funcRes: QueryResult = await client.query(`
    SELECT
      p.proname                             AS name,
      pg_get_function_arguments(p.oid)      AS arguments,
      pg_get_function_result(p.oid)         AS return_type,
      l.lanname                             AS language
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language  l ON l.oid = p.prolang
    WHERE n.nspname = 'public' AND p.prokind IN ('f','p')
    ORDER BY p.proname;`);
  const functions: FunctionInfo[] = funcRes.rows.map((r) => ({
    name: r.name, arguments: r.arguments,
    returnType: r.return_type, language: r.language,
  }));

  // Triggers
  const trigRes: QueryResult = await client.query(`
    SELECT
      t.trigger_name                         AS name,
      t.event_object_table                   AS table_name,
      t.action_timing                        AS timing,
      string_agg(t.event_manipulation, ', ') AS events
    FROM information_schema.triggers t
    WHERE t.trigger_schema = 'public'
    GROUP BY t.trigger_name, t.event_object_table, t.action_timing
    ORDER BY t.trigger_name;`);
  const triggers: TriggerInfo[] = trigRes.rows.map((r) => ({
    name: r.name, table_name: r.table_name,
    timing: r.timing, events: r.events,
  }));

  // Sequences
  const seqRes: QueryResult = await client.query(`
    SELECT sequence_name, start_value, increment
    FROM information_schema.sequences
    WHERE sequence_schema = 'public' ORDER BY sequence_name;`);
  const sequences: SequenceInfo[] = seqRes.rows.map((r) => ({
    name: r.sequence_name, start: r.start_value, increment: r.increment,
  }));

  // Custom Types (enum, composite, domain)
  const typeRes: QueryResult = await client.query(`
    SELECT t.typname AS name, t.typtype AS kind
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype IN ('e','c','d')
    ORDER BY t.typname;`);
  const types: TypeInfo[] = typeRes.rows.map((r) => ({ name: r.name, kind: r.kind }));

  // Indexes (excluding auto-created PK/unique)
  const idxRes: QueryResult = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT IN (SELECT conname FROM pg_constraint WHERE contype IN ('p','u'))
    ORDER BY indexname;`);
  const indexes = idxRes.rows.map((r) => r.indexname as string);

  // Extensions
  const extRes: QueryResult = await client.query(`SELECT extname FROM pg_extension ORDER BY extname;`);
  const extensions = extRes.rows.map((r) => r.extname as string);

  // RLS Policies (using pg_policies view — available in PG 9.5+)
  const rlsRes: QueryResult = await client.query(`
    SELECT
      policyname,
      tablename,
      cmd,
      permissive,
      array_to_string(roles, ',') AS roles,
      COALESCE(qual,       'null') AS qual,
      COALESCE(with_check, 'null') AS with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;`);
  const rlsPolicies: RlsPolicyInfo[] = rlsRes.rows.map((r) => ({
    key:        `${r.tablename}.${r.policyname}`,
    policyname: r.policyname,
    tablename:  r.tablename,
    cmd:        r.cmd,
    permissive: r.permissive,
    roles:      r.roles,
    qual:       r.qual,
    with_check: r.with_check,
  }));

  // Tables with RLS enabled (rowsecurity = true in pg_class)
  const rlsEnabledRes: QueryResult = await client.query(`
    SELECT relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
    ORDER BY relname;`);
  const rlsEnabled = rlsEnabledRes.rows.map((r) => r.tablename as string);

  await client.end();
  return { tables, columns, views, viewDefs, matViews, matViewDefs, functions, triggers, sequences, types, indexes, extensions, rlsPolicies, rlsEnabled };
}

// ─── Backup Schema Parser (pg_restore --schema-only) ─────────
interface BackupSchema {
  tables:     string[];
  columns:    Record<string, string[]>;
  views:      string[];
  viewDefs:   Record<string, string>;
  matViews:   string[];
  functions:  string[];
  triggers:   string[];
  sequences:  string[];
  types:      string[];
  extensions: string[];
  // RLS
  rlsPolicies: string[];   // "tablename.policyname"
  rlsEnabled:  string[];   // table names with "ENABLE ROW LEVEL SECURITY"
}

async function getBackupSchema(file: string, cfg: DbConfig): Promise<BackupSchema> {
  const env    = pgEnvVars(cfg);
  const format = detectBackupFormat(file);
  let sql = "";

  if (format === "plain") {
    // Plain SQL file — read directly, no need for pg_restore
    info(`Format détecté : ${color(C.yellow, "SQL plain")} → lecture directe du fichier`);
    sql = readPlainBackupSql(file);
  } else {
    // Custom binary format — extract schema to a TEMP FILE via pg_restore --schema-only -f
    // Using -f <tempfile> instead of stdout avoids ALL env-var conflicts:
    // pg_restore never needs -d when writing to a file, regardless of PGDATABASE/PGHOST etc.
    info(`Format détecté : ${color(C.cyan, "custom (binaire)")} → extraction via pg_restore`);

    const tmpFile = path.join(
      BACKUP_DIR,
      `.schema_tmp_${Date.now()}.sql`
    );

    try {
      // Completely clean env — only PATH needed, zero PG* vars
      const cleanEnv: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "/usr/bin:/usr/local/bin" };
      if (process.env.SYSTEMROOT) cleanEnv.SYSTEMROOT = process.env.SYSTEMROOT; // Windows

      await execAsync(
        `pg_restore --schema-only -f "${tmpFile}" "${file}"`,
        { env: cleanEnv, maxBuffer: 10 * 1024 * 1024 }
      );
      sql = fs.readFileSync(tmpFile, "utf-8");
    } catch (e: any) {
      // pg_restore exits 1 for warnings — the temp file may still contain valid SQL
      if (fs.existsSync(tmpFile)) {
        sql = fs.readFileSync(tmpFile, "utf-8");
      }
      if (!sql.trim()) {
        throw new Error(`pg_restore --schema-only -f a échoué:\n${e.stderr || e.message}`);
      }
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  }

  // Helper: extract object names by regex
  const extract = (re: RegExp): string[] =>
    [...new Set([...sql.matchAll(re)].map((m) => m[1]))];

  const tables    = extract(/CREATE TABLE (?:public\.)?(?:"?(\w+)"?)\s*\(/gi);
  const views     = extract(/CREATE (?:OR REPLACE )?VIEW (?:public\.)?(?:"?(\w+)"?)/gi);
  const matViews  = extract(/CREATE MATERIALIZED VIEW (?:public\.)?(?:"?(\w+)"?)/gi);
  const functions = [
    ...extract(/CREATE (?:OR REPLACE )?FUNCTION (?:public\.)?(?:"?(\w+)"?)\s*\(/gi),
    ...extract(/CREATE (?:OR REPLACE )?PROCEDURE (?:public\.)?(?:"?(\w+)"?)\s*\(/gi),
  ];
  const triggers  = extract(/CREATE (?:CONSTRAINT )?TRIGGER (?:"?(\w+)"?)/gi);
  const sequences = extract(/CREATE SEQUENCE (?:public\.)?(?:"?(\w+)"?)/gi);
  const types     = extract(/CREATE (?:TYPE|DOMAIN) (?:public\.)?(?:"?(\w+)"?)/gi);
  const extensions= extract(/CREATE EXTENSION (?:IF NOT EXISTS )?(?:"?(\w+)"?)/gi);

  // Columns per table
  const columns: Record<string, string[]> = {};
  for (const table of tables) {
    const re = new RegExp(`CREATE TABLE (?:public\\.)?(?:"?${table}"?)\\s*\\(([\\s\\S]*?)\\);`, "i");
    const m  = sql.match(re);
    if (!m) continue;
    columns[table] = m[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.match(/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN|--)/i))
      .map((l) => l.split(/\s+/)[0].replace(/"/g, "").replace(/,$/, ""))
      .filter(Boolean);
  }

  // View definitions (best-effort)
  const viewDefs: Record<string, string> = {};
  for (const v of views) {
    const re = new RegExp(`CREATE (?:OR REPLACE )?VIEW (?:public\\.)?(?:"?${v}"?)[\\s\\S]*?AS\\s+([\\s\\S]*?);\\n`, "i");
    const m  = sql.match(re);
    if (m) viewDefs[v] = m[1].trim().toLowerCase();
  }

  return { tables, columns, views, viewDefs, matViews, functions, triggers, sequences, types, extensions,
           rlsPolicies: parseRlsPolicies(sql), rlsEnabled: parseRlsEnabled(sql) };
}

// ─── RLS Parsers (from SQL text) ─────────────────────────────
/**
 * Extract "tablename.policyname" keys from a SQL dump.
 * pg_dump emits: CREATE POLICY "policyname" ON "public"."tablename" ...
 */
function parseRlsPolicies(sql: string): string[] {
  const re = /CREATE POLICY\s+"?(\w+)"?\s+ON\s+(?:public\.)?(?:"?(\w+)"?)/gi;
  const keys: string[] = [];
  for (const m of sql.matchAll(re)) {
    keys.push(`${m[2]}.${m[1]}`);  // tablename.policyname
  }
  return [...new Set(keys)];
}

/**
 * Extract table names that have RLS enabled.
 * pg_dump emits: ALTER TABLE ONLY public."tablename" ENABLE ROW LEVEL SECURITY;
 * or:            ALTER TABLE "tablename" ENABLE ROW LEVEL SECURITY;
 */
function parseRlsEnabled(sql: string): string[] {
  const re = /ALTER TABLE\s+(?:ONLY\s+)?(?:public\.)?(?:"?(\w+)"?)\s+ENABLE ROW LEVEL SECURITY/gi;
  return [...new Set([...sql.matchAll(re)].map((m) => m[1]))];
}

// ─── Diff Engine ──────────────────────────────────────────────
function computeDiff(target: FullSchemaInfo, backup: BackupSchema): SchemaDiff {
  // Tables
  const missingTables = backup.tables.filter((t) => !target.tables.includes(t));
  const extraTables   = target.tables.filter((t) => !backup.tables.includes(t));

  // Columns
  const missingColumns: Record<string, string[]> = {};
  const extraColumns:   Record<string, string[]> = {};
  for (const table of backup.tables.filter((t) => target.tables.includes(t))) {
    const bCols = backup.columns[table] || [];
    const tCols = (target.columns[table] || []).map((c) => c.column_name);
    const miss  = bCols.filter((c) => !tCols.includes(c));
    const extra = tCols.filter((c) => !bCols.includes(c));
    if (miss.length)  missingColumns[table] = miss;
    if (extra.length) extraColumns[table]   = extra;
  }

  // Views
  const missingViews = backup.views.filter((v) => !target.views.includes(v));
  const extraViews   = target.views.filter((v) => !backup.views.includes(v));
  const changedViews = backup.views.filter((v) => {
    if (!target.views.includes(v)) return false;
    const bDef = (backup.viewDefs[v]  || "").replace(/\s+/g, " ").trim();
    const tDef = (target.viewDefs[v] || "").replace(/\s+/g, " ").trim();
    return bDef !== "" && bDef !== tDef;
  });

  // Materialized Views
  const missingMatViews = backup.matViews.filter((v) => !target.matViews.includes(v));
  const extraMatViews   = target.matViews.filter((v) => !backup.matViews.includes(v));
  const changedMatViews: string[] = []; // body diff not available from backup SQL reliably

  // Functions
  const targetFuncNames  = target.functions.map((f) => f.name);
  const missingFunctions = backup.functions.filter((f) => !targetFuncNames.includes(f));
  const extraFunctions   = targetFuncNames.filter((f) => !backup.functions.includes(f));

  // Triggers
  const targetTrigNames  = target.triggers.map((t) => t.name);
  const missingTriggers  = backup.triggers.filter((t) => !targetTrigNames.includes(t));
  const extraTriggers    = targetTrigNames.filter((t) => !backup.triggers.includes(t));

  // Sequences
  const targetSeqNames  = target.sequences.map((s) => s.name);
  const missingSequences= backup.sequences.filter((s) => !targetSeqNames.includes(s));
  const extraSequences  = targetSeqNames.filter((s) => !backup.sequences.includes(s));

  // Types
  const targetTypeNames = target.types.map((t) => t.name);
  const missingTypes    = backup.types.filter((t) => !targetTypeNames.includes(t));
  const extraTypes      = targetTypeNames.filter((t) => !backup.types.includes(t));

  // Extensions
  const missingExtensions = backup.extensions.filter((e) => !target.extensions.includes(e));
  const extraExtensions   = target.extensions.filter((e) => !backup.extensions.includes(e));

  // RLS Policies
  const targetPolicyKeys = target.rlsPolicies.map((p) => p.key);
  const backupPolicyKeys = backup.rlsPolicies;
  const missingPolicies  = backupPolicyKeys.filter((k) => !targetPolicyKeys.includes(k));
  const extraPolicies    = targetPolicyKeys.filter((k) => !backupPolicyKeys.includes(k));

  // Changed policies: same key but different definition
  const changedPolicies: string[] = [];
  for (const key of backupPolicyKeys.filter((k) => targetPolicyKeys.includes(k))) {
    // We can't easily compare expressions from SQL parse vs live DB (formatting differs)
    // so we only flag if the count differs — full body diff would need normalisation
  }

  // RLS enabled/disabled mismatch
  const missingRlsEnabled = backup.rlsEnabled.filter((t) => !target.rlsEnabled.includes(t));
  const extraRlsEnabled   = target.rlsEnabled.filter((t) => !backup.rlsEnabled.includes(t));

  const targetIsEmpty =
    target.tables.length === 0 && target.views.length === 0 && target.functions.length === 0;

  const totalDiffs =
    missingTables.length + extraTables.length +
    Object.keys(missingColumns).length + Object.keys(extraColumns).length +
    missingViews.length  + extraViews.length  + changedViews.length +
    missingMatViews.length + extraMatViews.length +
    missingFunctions.length + extraFunctions.length +
    missingTriggers.length + extraTriggers.length +
    missingSequences.length + extraSequences.length +
    missingTypes.length + extraTypes.length +
    missingPolicies.length + extraPolicies.length +
    missingRlsEnabled.length + extraRlsEnabled.length;

  return {
    missingTables, extraTables, missingColumns, extraColumns,
    missingViews, extraViews, changedViews,
    missingMatViews, extraMatViews, changedMatViews,
    missingFunctions, extraFunctions,
    missingTriggers, extraTriggers,
    missingSequences, extraSequences,
    missingTypes, extraTypes,
    missingExtensions, extraExtensions,
    missingPolicies, extraPolicies, changedPolicies,
    missingRlsEnabled, extraRlsEnabled,
    totalDiffs, targetIsEmpty,
  };
}

// ─── Smart Analysis ───────────────────────────────────────────
async function analyzeForSmart(cfg: DbConfig, backupFile: string): Promise<SmartAnalysis> {
  info("Analyse complète de la base cible (tables, views, fonctions, triggers, types...)");
  const targetSchema = await getFullSchema(cfg);

  info("Extraction du schéma depuis le fichier backup...");
  const backupSchema = await getBackupSchema(backupFile, cfg);

  info("Calcul des différences...");
  const diff = computeDiff(targetSchema, backupSchema);

  const reasons: string[] = [];
  let recommendation: RestoreMode;

  if (diff.targetIsEmpty) {
    recommendation = "COMPLET";
    reasons.push("La base cible est vide → restauration complète recommandée");
  } else if (diff.totalDiffs === 0) {
    recommendation = "INCREMENTAL";
    reasons.push("Schémas 100% identiques → incrémental suffisant (données seules)");
  } else if (
    diff.missingTables.length   > 5  ||
    diff.extraTables.length     > 5  ||
    diff.missingViews.length    > 3  ||
    diff.changedViews.length    > 3  ||
    diff.missingFunctions.length > 5 ||
    diff.missingTypes.length    > 2  ||
    diff.totalDiffs             > 20
  ) {
    recommendation = "COMPLET";
    reasons.push(`Différences structurelles importantes (${diff.totalDiffs} diffs)`);
    reasons.push("COMPLET recommandé pour garantir la cohérence complète");
  } else {
    recommendation = "INCREMENTAL";
    reasons.push(`Différences mineures (${diff.totalDiffs} diffs) → incrémental adapté`);
    reasons.push("Views/fonctions/triggers manquants seront recréés, les excédentaires supprimés");
  }

  if (diff.missingExtensions.length > 0)
    reasons.push(`⚠ Extensions manquantes (${diff.missingExtensions.join(", ")}) — nécessite un accès superuser`);
  if (diff.changedViews.length > 0)
    reasons.push(`⚠ ${diff.changedViews.length} view(s) ont été modifiées et seront recréées`);

  return { recommendation, reasons, diff };
}

// ─── Smart Report ─────────────────────────────────────────────
function printDiffBlock(label: string, missing: string[], extra: string[], changed: string[] = []) {
  if (!missing.length && !extra.length && !changed.length) return;
  console.log(`\n  ${bold(label)}`);
  missing.forEach((x) => console.log(`    ${color(C.green,  "+")} ${x}  ${color(C.dim, "(manquant — sera créé)")}`));
  extra.forEach(  (x) => console.log(`    ${color(C.red,    "-")} ${x}  ${color(C.dim, "(en excès — sera supprimé)")}`));
  changed.forEach((x) => console.log(`    ${color(C.yellow, "~")} ${x}  ${color(C.dim, "(modifié — sera recréé)")}`));
}

async function displaySmartReport(analysis: SmartAnalysis): Promise<void> {
  const { diff } = analysis;
  const sep = `  ${"─".repeat(64)}`;
  console.log(`\n${sep}`);
  console.log(`  ${bold(color(C.magenta, "◈  RAPPORT D'ANALYSE SMART — OBJETS DATABASE"))}`);
  console.log(`${sep}\n`);

  const recColor = analysis.recommendation === "COMPLET" ? C.red : C.green;
  console.log(`  Recommandation   : ${color(C.bold + recColor, `● ${analysis.recommendation}`)}`);
  console.log(`  Différences      : ${bold(String(diff.totalDiffs))} objet(s) à synchroniser`);
  console.log(`  Base cible vide  : ${diff.targetIsEmpty ? color(C.green, "Oui") : color(C.dim, "Non")}\n`);

  console.log(`  ${bold("Raisons :")}`);
  analysis.reasons.forEach((r) => console.log(`    ${color(C.cyan, "→")} ${r}`));

  printDiffBlock("📋 Tables",              diff.missingTables,    diff.extraTables);
  printDiffBlock("👁  Views",              diff.missingViews,     diff.extraViews,    diff.changedViews);
  printDiffBlock("📦 Materialized Views",  diff.missingMatViews,  diff.extraMatViews, diff.changedMatViews);
  printDiffBlock("⚙️  Fonctions/Procédures",diff.missingFunctions, diff.extraFunctions);
  printDiffBlock("⚡ Triggers",            diff.missingTriggers,  diff.extraTriggers);
  printDiffBlock("🔢 Séquences",           diff.missingSequences, diff.extraSequences);
  printDiffBlock("🏷  Types/Enums/Domains",diff.missingTypes,     diff.extraTypes);
  printDiffBlock("🧩 Extensions",          diff.missingExtensions,diff.extraExtensions);

  // RLS Policies
  if (diff.missingPolicies.length || diff.extraPolicies.length || diff.changedPolicies.length ||
      diff.missingRlsEnabled.length || diff.extraRlsEnabled.length) {
    console.log(`\n  ${bold("🔒 Row Level Security (RLS)")}`);
    if (diff.missingRlsEnabled.length)
      diff.missingRlsEnabled.forEach((t) =>
        console.log(`    ${color(C.green, "+")} ${t}  ${color(C.dim, "(RLS à activer — ENABLE ROW LEVEL SECURITY)")}`));
    if (diff.extraRlsEnabled.length)
      diff.extraRlsEnabled.forEach((t) =>
        console.log(`    ${color(C.red,   "-")} ${t}  ${color(C.dim, "(RLS à désactiver — DISABLE ROW LEVEL SECURITY)")}`));
    if (diff.missingPolicies.length)
      diff.missingPolicies.forEach((k) =>
        console.log(`    ${color(C.green, "+")} Politique : ${k}  ${color(C.dim, "(manquante — sera créée)")}`));
    if (diff.extraPolicies.length)
      diff.extraPolicies.forEach((k) =>
        console.log(`    ${color(C.red,   "-")} Politique : ${k}  ${color(C.dim, "(en excès — sera supprimée)")}`));
    if (diff.changedPolicies.length)
      diff.changedPolicies.forEach((k) =>
        console.log(`    ${color(C.yellow,"~")} Politique : ${k}  ${color(C.dim, "(modifiée — sera recréée)")}`));
  }

  // Column details
  const hasColDiff = Object.keys(diff.missingColumns).length + Object.keys(diff.extraColumns).length > 0;
  if (hasColDiff) {
    console.log(`\n  ${bold("🗂  Colonnes")}`);
    for (const [t, cols] of Object.entries(diff.missingColumns))
      console.log(`    ${color(C.cyan, t)} → manquantes : ${color(C.green, cols.join(", "))}`);
    for (const [t, cols] of Object.entries(diff.extraColumns))
      console.log(`    ${color(C.cyan, t)} → en excès   : ${color(C.red, cols.join(", "))}`);
  }

  console.log(`\n${sep}\n`);
}

// ─── BACKUP ───────────────────────────────────────────────────
async function runBackup(env: Environment, cfg: DbConfig): Promise<string> {
  ensureBackupDir();
  const outFile = getBackupFilename(env);
  const env2    = pgEnvVars(cfg);

  step(1, 2, `Connexion à ${env} (${cfg.host})`);
  info(`Base : ${color(C.cyan, cfg.database)} · User : ${color(C.cyan, cfg.user)}`);

  step(2, 2, "Dump complet — tables, views, mat.views, fonctions, triggers, types, séquences, index, extensions...");
  info(`Fichier de sortie : ${color(C.cyan, outFile)}`);

  try {
    await execAsync(pgDumpCmd(cfg, outFile), { env: env2, maxBuffer: 500 * 1024 * 1024 });
    const stat = fs.statSync(outFile);
    const mb   = (stat.size / 1024 / 1024).toFixed(2);
    success(`Backup terminé — ${color(C.green, mb + " MB")} → ${color(C.cyan, outFile)}`);
    return outFile;
  } catch (e: any) {
    error("Échec du backup :"); console.error(e.stderr || e.message); throw e;
  }
}

// ─── Restore Runner (format-aware, always captures stderr) ────
/**
 * Runs pg_restore or psql depending on format.
 * NEVER uses --exit-on-error — we always let it run to completion
 * and inspect stderr ourselves. pg_restore exits 1 for warnings,
 * exits >1 for real errors. psql exits non-zero too.
 */
async function runRestore(
  format: "custom" | "plain",
  cfg: DbConfig,
  file: string,
  env: NodeJS.ProcessEnv,
  extraFlags = ""
): Promise<{ stderr: string; exitCode: number }> {
  const cmd = format === "custom"
    ? pgRestoreCmd(cfg, file, extraFlags)
    : psqlRestoreCmd(cfg, file);

  try {
    const { stderr } = await execAsync(cmd, { env, maxBuffer: 500 * 1024 * 1024 });
    return { stderr: stderr || "", exitCode: 0 };
  } catch (e: any) {
    // execAsync throws on any non-zero exit — that's normal for pg_restore
    return { stderr: e.stderr || e.message || "", exitCode: e.code ?? 1 };
  }
}

/** Classify pg_restore/psql stderr lines into errors vs noise */
function classifyStderr(stderr: string): { errors: string[]; warnings: string[] } {
  const NOISE = [
    /^pg_restore:/,
    /^WARNING:/i,
    /could not execute query/i,
    /relation .* already exists/i,
    /must be owner/i,
    /no privileges/i,
    /permission denied/i,
    /role .* does not exist/i,
    /extension .* already exists/i,
    /schema .* already exists/i,
    /type .* already exists/i,
    /function .* already exists/i,
  ];
  const REAL_ERRORS = [
    /syntax error/i,
    /undefined table/i,
    /undefined column/i,
    /violates/i,
    /duplicate key/i,
    /canceling statement/i,
    /connection refused/i,
    /authentication failed/i,
    /could not connect/i,
    /FATAL:/i,
    /ERROR:.*table/i,
  ];

  const errors: string[]   = [];
  const warnings: string[] = [];

  for (const line of stderr.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (REAL_ERRORS.some((re) => re.test(line))) errors.push(line);
    else if (NOISE.some((re) => re.test(line)))  warnings.push(line);
    else if (line.startsWith("ERROR:"))          errors.push(line);
    else                                          warnings.push(line);
  }

  return { errors, warnings };
}

function reportRestoreOutput(stderr: string, exitCode: number): void {
  if (!stderr.trim()) { success("Restauration terminée sans avertissements"); return; }

  const { errors, warnings } = classifyStderr(stderr);

  if (errors.length === 0) {
    success(`Restauration terminée — ${warnings.length} avertissement(s) de permission ignorés (normal Supabase)`);
  } else {
    warn(`Restauration terminée avec ${errors.length} erreur(s) et ${warnings.length} avertissement(s)`);
  }
}

function printRestoreErrors(stderr: string): void {
  const { errors, warnings } = classifyStderr(stderr);
  if (errors.length) {
    console.log(`\n  ${bold("Erreurs :")} `);
    errors.slice(0, 15).forEach((l) => console.log(`    ${color(C.red, "✖")} ${l}`));
    if (errors.length > 15) info(`... et ${errors.length - 15} erreur(s) supplémentaire(s)`);
  }
  if (warnings.length && errors.length === 0) {
    console.log(`\n  ${bold("Avertissements (permissions — ignorés) :")}`);
    warnings.slice(0, 5).forEach((l) => console.log(`    ${color(C.dim, l)}`));
    if (warnings.length > 5) info(`... et ${warnings.length - 5} avertissement(s) supplémentaire(s)`);
  }
}

// ─── Supabase Grants Re-applicator ───────────────────────────
/**
 * After any restore with --no-acl, Supabase roles (anon, authenticated,
 * service_role) lose their GRANTs. This function re-applies the standard
 * Supabase permission model so the API and RLS work correctly.
 *
 * Called automatically after COMPLET and INCREMENTAL restores.
 */
async function reapplySupabaseGrants(cfg: DbConfig): Promise<void> {
  const client = makeClient(cfg);
  await client.connect();

  const grants = [
    // Schema access
    `GRANT USAGE  ON SCHEMA public TO anon, authenticated, service_role`,
    `GRANT CREATE ON SCHEMA public TO service_role`,
    // All existing tables
    `GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role`,
    // All sequences (needed for INSERT with serial/identity columns)
    `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role`,
    // All functions / procedures
    `GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO anon, authenticated, service_role`,
    // Default privileges for future objects
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES  TO anon, authenticated, service_role`,
  ];

  let ok = 0;
  for (const sql of grants) {
    try {
      await client.query(sql);
      ok++;
    } catch (e: any) {
      // Roles may not exist in non-Supabase environments — warn but continue
      warn(`GRANT ignoré (rôle absent ?) : ${e.message.split("\n")[0]}`);
    }
  }

  // Report: how many tables / sequences / routines are now accessible
  const tableCount = await client.query(`
    SELECT COUNT(*) AS n FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'authenticated';`);
  const n = tableCount.rows[0]?.n ?? "?";

  await client.end();
  success(`Permissions Supabase réappliquées (${ok}/${grants.length} statements) — ${n} table(s) accessibles par 'authenticated'`);
}

// ─── RESTORE COMPLET ──────────────────────────────────────────
async function restoreComplet(cfg: DbConfig, backupFile: string): Promise<void> {
  const env2  = pgEnvVars(cfg);
  const STEPS = 5;

  step(1, STEPS, "Connexion à la base cible...");
  const client = makeClient(cfg);
  await client.connect();
  success("Connecté");

  step(2, STEPS, "Suppression complète du schéma public (tables, views, fonctions, triggers, types, séquences, index...)");
  await client.query(`DROP   SCHEMA IF EXISTS public CASCADE;`);
  await client.query(`CREATE SCHEMA public;`);
  await client.query(`GRANT ALL ON SCHEMA public TO public;`);
  await client.query(`GRANT ALL ON SCHEMA public TO ${cfg.user};`);
  success("Schéma public entièrement réinitialisé");
  await client.end();

  step(3, STEPS, "Restauration complète depuis le backup...");
  const format = detectBackupFormat(backupFile);
  info(`Format du fichier : ${format === "custom" ? color(C.cyan, "custom (pg_restore)") : color(C.yellow, "SQL plain (psql)")}`);

  const { stderr: restoreStderr, exitCode: restoreCode } = await runRestore(
    format, cfg, backupFile, env2,
    format === "custom" ? "" : ""   // no --exit-on-error: let it continue past permission errors
  );

  reportRestoreOutput(restoreStderr, restoreCode);

  step(4, STEPS, "Réapplication des permissions Supabase (anon / authenticated / service_role)...");
  await reapplySupabaseGrants(cfg);

  step(5, STEPS, "Vérification post-restauration...");
  const schema = await getFullSchema(cfg);

  if (schema.tables.length === 0 && restoreStderr) {
    console.log(`\n  ${bold(color(C.red, "⚠  Restauration incomplète — erreurs pg_restore :"))}`);
    printRestoreErrors(restoreStderr);
    console.log();
    warn("Conseil : ces erreurs surviennent souvent avec le pooler Supabase (port 6543).");
    warn("Essayez avec la connexion directe à la DB (port 5432) dans votre .env.");
    throw new Error("Aucune table restaurée — voir les erreurs ci-dessus");
  }

  success(`Tables : ${schema.tables.length} · Views : ${schema.views.length} · Mat.Views : ${schema.matViews.length}`);
  success(`Fonctions : ${schema.functions.length} · Triggers : ${schema.triggers.length} · Types : ${schema.types.length} · Séquences : ${schema.sequences.length}`);
  success(`Politiques RLS : ${schema.rlsPolicies.length} sur ${schema.rlsEnabled.length} table(s) protégée(s)`);
}

// ─── RESTORE INCREMENTAL ──────────────────────────────────────
async function restoreIncremental(cfg: DbConfig, backupFile: string): Promise<void> {
  const env2  = pgEnvVars(cfg);
  const STEPS = 6;

  step(1, STEPS, "Analyse complète de la base cible...");
  const targetSchema = await getFullSchema(cfg);
  success(`Tables: ${targetSchema.tables.length} · Views: ${targetSchema.views.length} · Mat.Views: ${targetSchema.matViews.length} · Fonctions: ${targetSchema.functions.length} · Triggers: ${targetSchema.triggers.length} · Types: ${targetSchema.types.length}`);

  step(2, STEPS, "Extraction du schéma depuis le backup...");
  const backupSchema = await getBackupSchema(backupFile, cfg);
  success(`Tables: ${backupSchema.tables.length} · Views: ${backupSchema.views.length} · Mat.Views: ${backupSchema.matViews.length} · Fonctions: ${backupSchema.functions.length} · Triggers: ${backupSchema.triggers.length} · Types: ${backupSchema.types.length}`);

  step(3, STEPS, "Calcul du diff...");
  const diff = computeDiff(targetSchema, backupSchema);
  info(`${diff.totalDiffs} différences détectées`);

  step(4, STEPS, "Suppression des objets excédentaires (DDL)...");
  const client = makeClient(cfg);
  await client.connect();

  // Drop extra views (before tables to avoid dependency issues)
  for (const v of [...diff.extraViews, ...diff.changedViews]) {
    try { await client.query(`DROP VIEW IF EXISTS public."${v}" CASCADE;`); info(`View supprimée : ${v}`); }
    catch (e: any) { warn(`DROP VIEW ${v}: ${e.message}`); }
  }

  // Drop extra materialized views
  for (const v of [...diff.extraMatViews, ...diff.changedMatViews]) {
    try { await client.query(`DROP MATERIALIZED VIEW IF EXISTS public."${v}" CASCADE;`); info(`Mat.View supprimée : ${v}`); }
    catch (e: any) { warn(`DROP MATERIALIZED VIEW ${v}: ${e.message}`); }
  }

  // Drop extra triggers
  for (const t of diff.extraTriggers) {
    const trig = targetSchema.triggers.find((tr) => tr.name === t);
    if (trig) {
      try {
        await client.query(`DROP TRIGGER IF EXISTS "${t}" ON public."${trig.table_name}" CASCADE;`);
        info(`Trigger supprimé : ${t} (sur ${trig.table_name})`);
      } catch (e: any) { warn(`DROP TRIGGER ${t}: ${e.message}`); }
    }
  }

  // Drop extra functions
  for (const f of diff.extraFunctions) {
    const fn = targetSchema.functions.find((fn) => fn.name === f);
    if (fn) {
      try {
        await client.query(`DROP FUNCTION IF EXISTS public."${f}"(${fn.arguments}) CASCADE;`);
        info(`Fonction supprimée : ${f}`);
      } catch (e: any) {
        // Try without arguments (overloaded functions)
        try { await client.query(`DROP FUNCTION IF EXISTS public."${f}" CASCADE;`); info(`Fonction supprimée : ${f}`); }
        catch { warn(`DROP FUNCTION ${f}: ${e.message}`); }
      }
    }
  }

  // Drop extra types
  for (const t of diff.extraTypes) {
    try { await client.query(`DROP TYPE IF EXISTS public."${t}" CASCADE;`); info(`Type supprimé : ${t}`); }
    catch (e: any) { warn(`DROP TYPE ${t}: ${e.message}`); }
  }

  // Drop extra tables
  for (const t of diff.extraTables) {
    try { await client.query(`DROP TABLE IF EXISTS public."${t}" CASCADE;`); info(`Table supprimée : ${t}`); }
    catch (e: any) { warn(`DROP TABLE ${t}: ${e.message}`); }
  }

  // Drop extra columns
  for (const [table, cols] of Object.entries(diff.extraColumns)) {
    for (const col of cols) {
      try {
        await client.query(`ALTER TABLE public."${table}" DROP COLUMN IF EXISTS "${col}" CASCADE;`);
        info(`Colonne supprimée : ${table}.${col}`);
      } catch (e: any) { warn(`DROP COLUMN ${table}.${col}: ${e.message}`); }
    }
  }

  // Drop extra sequences
  for (const s of diff.extraSequences) {
    try { await client.query(`DROP SEQUENCE IF EXISTS public."${s}" CASCADE;`); info(`Séquence supprimée : ${s}`); }
    catch (e: any) { warn(`DROP SEQUENCE ${s}: ${e.message}`); }
  }

  // ── RLS: Drop extra policies
  for (const key of diff.extraPolicies) {
    const [tablename, policyname] = key.split(".");
    try {
      await client.query(`DROP POLICY IF EXISTS "${policyname}" ON public."${tablename}";`);
      info(`Politique RLS supprimée : ${key}`);
    } catch (e: any) { warn(`DROP POLICY ${key}: ${e.message}`); }
  }

  // ── RLS: Disable RLS on tables that should not have it
  for (const t of diff.extraRlsEnabled) {
    try {
      await client.query(`ALTER TABLE public."${t}" DISABLE ROW LEVEL SECURITY;`);
      info(`RLS désactivé : ${t}`);
    } catch (e: any) { warn(`DISABLE RLS ${t}: ${e.message}`); }
  }

  await client.end();
  success("Suppressions DDL terminées");

  step(5, STEPS, "Restauration des objets manquants (schéma : tables, views, fonctions, triggers, types, séquences, index)...");
  const format = detectBackupFormat(backupFile);
  info(`Format du fichier : ${format === "custom" ? color(C.cyan, "custom (pg_restore)") : color(C.yellow, "SQL plain (psql)")}`);

  if (format === "custom") {
    const { stderr: s5, exitCode: c5 } = await runRestore(format, cfg, backupFile, env2, "--schema-only");
    reportRestoreOutput(s5, c5);
    const { errors: e5 } = classifyStderr(s5);
    if (e5.length) { printRestoreErrors(s5); }

    // After schema-only restore, explicitly enable RLS on tables that need it
    // (pg_restore --schema-only may skip ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    //  if the table already existed, since it uses CREATE TABLE which omits it)
    if (diff.missingRlsEnabled.length > 0) {
      const rlsClient = makeClient(cfg);
      await rlsClient.connect();
      for (const t of diff.missingRlsEnabled) {
        try {
          await rlsClient.query(`ALTER TABLE public."${t}" ENABLE ROW LEVEL SECURITY;`);
          info(`RLS activé : ${t}`);
        } catch (e: any) { warn(`ENABLE RLS ${t}: ${e.message}`); }
      }
      await rlsClient.end();
    }
  } else {
    // Plain SQL: psql replays schema + data together — duplicate object errors are expected and ignored
    warn("Fichier SQL plain — le schéma et les données seront rejoués intégralement");
    const { stderr: s5, exitCode: c5 } = await runRestore(format, cfg, backupFile, env2);
    reportRestoreOutput(s5, c5);
    // schema + data replayed in one shot → skip step 6
    await reapplySupabaseGrants(cfg);
    const finalSchema = await getFullSchema(cfg);
    success(`Résultat final — Tables: ${finalSchema.tables.length} · Views: ${finalSchema.views.length} · Mat.Views: ${finalSchema.matViews.length} · Fonctions: ${finalSchema.functions.length} · Triggers: ${finalSchema.triggers.length}`);
    success(`Politiques RLS : ${finalSchema.rlsPolicies.length} sur ${finalSchema.rlsEnabled.length} table(s) protégée(s)`);
    return;
  }

  step(6, STEPS, "Synchronisation des données...");
  const { stderr: s6, exitCode: c6 } = await runRestore(format, cfg, backupFile, env2, "--data-only --disable-triggers");
  reportRestoreOutput(s6, c6);
  const { errors: e6 } = classifyStderr(s6);
  if (e6.length) printRestoreErrors(s6);

  // Re-apply Supabase role grants (--no-acl may have left authenticated/anon without access)
  await reapplySupabaseGrants(cfg);

  // Post-check
  const finalSchema = await getFullSchema(cfg);
  success(`Résultat final — Tables: ${finalSchema.tables.length} · Views: ${finalSchema.views.length} · Mat.Views: ${finalSchema.matViews.length} · Fonctions: ${finalSchema.functions.length} · Triggers: ${finalSchema.triggers.length}`);
  success(`Politiques RLS : ${finalSchema.rlsPolicies.length} sur ${finalSchema.rlsEnabled.length} table(s) protégée(s)`);
}

// ─── File Picker ──────────────────────────────────────────────
async function pickBackupFile(env: Environment): Promise<string> {
  let files = listBackupFiles(env);
  if (!files.length) {
    warn(`Aucun backup pour ${env}. Affichage de tous les backups disponibles...`);
    files = listBackupFiles();
  }
  if (!files.length) throw new Error(`Aucun fichier backup trouvé dans ${BACKUP_DIR}`);
  if (files.length === 1) { info(`Fichier : ${color(C.cyan, path.basename(files[0]))}`); return files[0]; }

  console.log(`\n  ${bold("Fichiers backup disponibles :")}\n`);
  files.slice(0, 10).forEach((f, i) => {
    const stat   = fs.statSync(f);
    const mb     = (stat.size / 1024 / 1024).toFixed(2);
    const date   = stat.mtime.toLocaleString("fr-FR");
    const fmt    = detectBackupFormat(f);
    const fmtTag = fmt === "custom"
      ? color(C.cyan,   "[custom]")
      : color(C.yellow, "[sql]   ");
    console.log(`    ${color(C.cyan, `[${i + 1}]`)} ${fmtTag} ${path.basename(f)} ${color(C.dim, `(${mb} MB · ${date})`)}`);
  });

  while (true) {
    const a = await ask(`\n  Choisissez [1-${Math.min(files.length, 10)}] : `);
    const i = parseInt(a) - 1;
    if (i >= 0 && i < Math.min(files.length, 10)) return files[i];
    warn("Choix invalide");
  }
}

// ─── Execute Restore ──────────────────────────────────────────
async function executeRestore(mode: RestoreMode, cfg: DbConfig, backupFile: string): Promise<void> {
  const label = mode === "COMPLET"
    ? color(C.red + C.bold, "COMPLET")
    : color(C.yellow + C.bold, "INCRÉMENTAL");

  const confirmed = mode === "COMPLET"
    ? await confirm(`La restauration ${label} va ${color(C.red + C.bold, "EFFACER COMPLÈTEMENT")} la base "${cfg.database}" (tables, views, fonctions, types, séquences...). Confirmer ?`)
    : await confirm(`Lancer la restauration ${label} sur "${cfg.database}" ?`);

  if (!confirmed) { warn("Opération annulée"); return; }

  console.log();
  const start = Date.now();
  try {
    if (mode === "COMPLET") await restoreComplet(cfg, backupFile);
    else                    await restoreIncremental(cfg, backupFile);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const sep     = `  ${"─".repeat(64)}`;
    console.log(`\n${sep}`);
    success(color(C.green + C.bold, `Restauration ${mode} terminée en ${elapsed}s !`));
    console.log(`${sep}\n`);
  } catch (e: any) {
    error(`Restauration échouée : ${e.message}`);
    process.exit(1);
  }
}

// ─── Banner ───────────────────────────────────────────────────
function printBanner() {
  console.clear();
  const b = (s: string) => `  ${color(C.bold + C.cyan, s)}`;
  console.log();
  console.log(b("╔══════════════════════════════════════════════════════════╗"));
  console.log(b("║") + color(C.bold, "         ◈  SUPABASE DATABASE BACKUP & RESTORE  ◈        ") + b("║"));
  console.log(b("║") + color(C.dim,  "   Tables · Views · Mat.Views · Functions · Triggers     ") + b("║"));
  console.log(b("║") + color(C.dim,  "   Sequences · Types · Indexes · Extensions              ") + b("║"));
  console.log(b("╚══════════════════════════════════════════════════════════╝"));
  console.log();
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  printBanner();

  const operation = await askChoice<Operation>(
    "Quelle opération souhaitez-vous effectuer ?",
    [
      { key: "1", value: "BACKUP",  label: "BACKUP",  description: "Créer une sauvegarde complète" },
      { key: "2", value: "RESTORE", label: "RESTORE", description: "Restaurer depuis un backup existant" },
    ]
  );

  const env = await askChoice<Environment>(
    "Quel environnement ?",
    [
      { key: "T", value: "TEST", label: "TEST", description: "Environnement de test" },
      { key: "P", value: "PROD", label: "PROD", description: color(C.red, "Environnement de production ⚠") },
    ]
  );

  let cfg: DbConfig;
  try { cfg = loadDbConfig(env); }
  catch (e: any) { error(e.message); rl.close(); process.exit(1); }

  console.log(`\n  ${color(C.dim, `Host: ${cfg.host} · DB: ${cfg.database} · User: ${cfg.user}`)}`);

  if (env === "PROD") {
    const ok = await confirm(color(C.red + C.bold, "Vous êtes sur le point d'agir sur la PRODUCTION. Confirmer ?"));
    if (!ok) { warn("Opération annulée"); rl.close(); process.exit(0); }
  }

  // ── BACKUP ──
  if (operation === "BACKUP") {
    console.log();
    try {
      await runBackup(env, cfg);
      const sep = `  ${"─".repeat(64)}`;
      console.log(`\n${sep}`);
      success(color(C.green + C.bold, "Backup complété avec succès !"));
      console.log(`${sep}\n`);
    } catch { error("Le backup a échoué"); rl.close(); process.exit(1); }
    rl.close(); return;
  }

  // ── RESTORE ──
  const restoreMode = await askChoice<RestoreMode>(
    "Mode de restauration ?",
    [
      { key: "1", value: "COMPLET",     label: color(C.red,    "COMPLET"),     description: "DROP CASCADE + restauration totale (100% fiable)" },
      { key: "2", value: "INCREMENTAL", label: color(C.yellow, "INCRÉMENTAL"), description: "Sync tables/views/fonctions/triggers/types/données" },
      { key: "3", value: "SMART",       label: color(C.green,  "SMART"),       description: "Analyse diff complet et recommande la méthode" },
    ]
  );

  let backupFile: string;
  try { backupFile = await pickBackupFile(env); }
  catch (e: any) { error(e.message); rl.close(); process.exit(1); }

  info(`Fichier sélectionné : ${color(C.cyan, path.basename(backupFile))}`);

  if (restoreMode === "SMART") {
    console.log();
    let analysis: SmartAnalysis;
    try { analysis = await analyzeForSmart(cfg, backupFile); }
    catch (e: any) { error(`Erreur analyse : ${e.message}`); rl.close(); process.exit(1); }

    await displaySmartReport(analysis);

    const proceed = await askChoice<"AUTO" | "MANUAL" | "CANCEL">(
      "Que souhaitez-vous faire ?",
      [
        { key: "1", value: "AUTO",   label: `Appliquer la recommandation (${analysis.recommendation})` },
        { key: "2", value: "MANUAL", label: "Choisir manuellement le mode" },
        { key: "3", value: "CANCEL", label: "Annuler" },
      ]
    );

    if (proceed === "CANCEL") { warn("Opération annulée"); rl.close(); process.exit(0); }

    let finalMode: RestoreMode = analysis.recommendation;
    if (proceed === "MANUAL") {
      finalMode = await askChoice<RestoreMode>("Mode manuel :", [
        { key: "1", value: "COMPLET",     label: color(C.red,    "COMPLET") },
        { key: "2", value: "INCREMENTAL", label: color(C.yellow, "INCRÉMENTAL") },
      ]);
    }

    await executeRestore(finalMode, cfg, backupFile);
  } else {
    await executeRestore(restoreMode, cfg, backupFile);
  }

  rl.close();
}

main().catch((e) => { error(`Erreur inattendue : ${e.message}`); rl.close(); process.exit(1); });