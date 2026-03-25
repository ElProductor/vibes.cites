// database.ts
import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Arquitectura de Base de Datos Distribuida (Master-Replica Pattern)
export class LocalDB {
  private pool?: Pool;
  private localDbPromise?: Promise<Database>;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // El constructor se mantiene ligero. La inicialización se maneja explícitamente.
  }

  public initialize(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this._initialize();
    }
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
     if (process.env.DATABASE_URL) {
       this.pool = new Pool({ 
         connectionString: process.env.DATABASE_URL,
         max: 20,
         idleTimeoutMillis: 30000,
         connectionTimeoutMillis: 2000
       });
       await this.init(); // Esperamos a que la inicialización de Postgres termine
     } else {
       const connection = open({
         filename: './vibe.db',
         driver: sqlite3.Database
       });
       this.localDbPromise = connection.then(async (db) => {
         try {
           await this.initSqlite(db);
         } catch (e) {
           console.error("❌ Error crítico inicializando DB:", e);
         }
         return db;
       });
       await this.localDbPromise; // Esperamos a que la inicialización de SQLite termine
     }
  }

  async init() {
    console.log("⚙️ Inicializando Motor de Base de Datos...");
    if (this.pool) {
      await this.initPostgres();
    }
  }

  private async runSchema(schemaPath: string, queryRunner: (schema: string) => Promise<any>) {
    if (!fs.existsSync(schemaPath)) {
      // Intenta buscar en la raíz si no lo encuentra en dist
      const rootPath = schemaPath.replace(path.join('..', path.sep), '');
      if (!fs.existsSync(rootPath)) {
        console.error(`❌ FATAL: No se encontró el archivo de esquema en ${schemaPath} ni en ${rootPath}.`);
        return;
      }
      schemaPath = rootPath;
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await queryRunner(schema);
  }

  async initPostgres() {
    if (!this.pool) return;
    try {
      await this.runSchema(path.join(__dirname, '..', 'schema.postgres.sql'), (schema) => this.pool!.query(schema));
      console.log("✅ Esquema de PostgreSQL aplicado.");

      // Lógica de Migraciones/Alteraciones Idempotentes
      await this.applyPostgresMigrations();

      // Lógica de Seeding (datos iniciales)
      await this.seedPostgres();

    } catch (err) {
      console.error("❌ Error inicializando PostgreSQL:", err);
    }
  }

  async applyPostgresMigrations() {
    if (!this.pool) return;
    console.log("🔄 Aplicando migraciones de PostgreSQL...");
    const migrations = [
      // Tablas y columnas adicionales para Social Feed e Integraciones
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_id VARCHAR(255);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_coins INTEGER DEFAULT 0;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_reward_claim TIMESTAMPTZ;`,
      
      // Nuevas columnas de Eventos Comerciales
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS name VARCHAR(100);`, // Compatibilidad con SQLite
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS lat REAL;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS lng REAL;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS distance TEXT;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price REAL DEFAULT 0;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS lineup TEXT;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS vibe VARCHAR(50);`,

      `CREATE TABLE IF NOT EXISTS social_posts (
          id SERIAL PRIMARY KEY,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          image_url VARCHAR(255),
          likes_count INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS post_likes (
          post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (post_id, user_id)
      );`
    ];

    for (const migration of migrations) {
      await this.pool.query(migration);
    }
    console.log("✅ Migraciones de PostgreSQL completadas.");
  }

  async seedPostgres() {
    if (!this.pool) return;
    const eventCount = await this.pool.query("SELECT COUNT(*) as count FROM events");
    if (parseInt(eventCount.rows[0].count) === 0) {
      console.log("🌱 Sembrando base de datos PostgreSQL...");
      await this.pool.query(`INSERT INTO events (id, title, activity_type, event_date, name, lat, lng, distance, capacity) VALUES 
      ('1', 'Neon Art Drop 🍸', 'ART_EXHIBIT', '2026-07-15 20:00:00', 'Neon Art Drop 🍸', 19.4326, -99.1332, '0.5km', 90),
      ('2', 'Bresh Party Mexico 🪩', 'PARTY', '2026-07-18 22:00:00', 'Bresh Party Mexico 🪩', 19.4340, -99.1350, '1.2km', 850),
      ('3', 'Secret Rooftop (Vibe+) 🌙', 'LOUNGE', '2026-07-20 21:00:00', 'Secret Rooftop (Vibe+) 🌙', 19.4300, -99.1400, '3km', 100)`);
      console.log("🌱 Datos de eventos insertados.");
    }
  }

  async initSqlite(sqliteDb: Database) {
    if (!sqliteDb) return;
    try {
      await this.runSchema(path.join(__dirname, '..', 'schema.sqlite.sql'), (schema) => sqliteDb.exec(schema));
      console.log("✅ Esquema de SQLite aplicado.");
    } catch (err) {
      console.error("❌ Error inicializando SQLite:", err);
    }
  }

  /**
   * Enrutador de Consultas (Database Sharding / Routing)
   * Analiza la query para decidir si la envía al nodo MAESTRO (Escrituras)
   * o balancea la carga entre nodos ESCLAVOS/REPLICAS (Lecturas)
   */
  async query(text: string, params: any[] = []) {
    if (this.pool) {
      // PostgreSQL
      return this.pool.query(text, params);
    } else {
      // SQLite
      const db = await this.localDbPromise!;
      const isSelect = /^\s*(SELECT|WITH)/i.test(text);
      const hasReturning = /RETURNING/i.test(text);

      // Convert PG params to SQLite
      const sqliteParams: any[] = [];
      let sqliteQuery = text.replace(/\$(\d+)/g, (_, match) => {
        const index = parseInt(match, 10) - 1;
        sqliteParams.push(params[index]);
        return '?';
      });

      const sanitizedParams = sqliteParams.map(p => {
        if (p === undefined) return null;
        if (Array.isArray(p)) return JSON.stringify(p);
        return p;
      });

      // Convert PostgreSQL INTERVAL syntax to SQLite datetime
      sqliteQuery = sqliteQuery.replace(/NOW\(\) - INTERVAL '(\d+) minutes'/g, "datetime('now', '-$1 minutes')");

      try {
        if (isSelect || hasReturning) {
          const rows = await db.all(sqliteQuery, sanitizedParams);
          return { rows, rowCount: rows.length };
        } else {
          const result = await db.run(sqliteQuery, sanitizedParams);
          return { rows: [], rowCount: result.changes };
        }
      } catch (error) {
        console.error('SQL Error:', error);
        console.error('Query:', sqliteQuery);
        return { rows: [], rowCount: 0, error: String(error) }; // Devolver un objeto de error consistente
      }
    }
  }
}

export const db = new LocalDB();
