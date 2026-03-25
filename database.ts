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

  constructor() {
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        max: 20, // Limita las conexiones simultáneas para no saturar el plan gratuito de Supabase
        idleTimeoutMillis: 30000, // Cierra conexiones inactivas después de 30s
        connectionTimeoutMillis: 2000 // Falla rápido si no puede conectar en 2s
      });
      this.init();
    } else {
      // Mantenemos SQLite como fallback de desarrollo
      const connection = open({
        filename: './vibe.db',
        driver: sqlite3.Database
      });
      this.localDbPromise = connection.then(async (db) => {
        try {
          await this.init(db);
        } catch (e) {
          console.error("❌ Error crítico inicializando DB:", e);
        }
        return db;
      });
    }
  }

  async init(sqliteDb?: Database) {
    console.log("⚙️ Inicializando Motor de Base de Datos...");

    if (this.pool) {
      // PostgreSQL
      // Carga el esquema correcto para PostgreSQL. Asume que has renombrado '-- schema.sql' a 'schema.postgres.sql'
      let schemaPath = path.join(__dirname, '..', 'schema.postgres.sql'); // Para cuando se ejecuta desde la carpeta 'dist'
      if (!fs.existsSync(schemaPath)) {
        schemaPath = path.join(__dirname, 'schema.postgres.sql'); // Para cuando se ejecuta desde la raíz (ts-node)
      }
      if (!fs.existsSync(schemaPath)) return console.error('❌ FATAL: No se encontró el archivo schema.postgres.sql. Asegúrate de renombrarlo y subirlo.');
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      try {
        await this.pool.query(schema);

        // Tablas y columnas adicionales para Social Feed e Integraciones
        await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_id VARCHAR(255);`);
        
        // Nuevas columnas de Eventos Comerciales
        await this.pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;`);
        await this.pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price REAL DEFAULT 0;`);
        await this.pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS lineup TEXT;`);
        await this.pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);`);
        await this.pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS vibe VARCHAR(50);`);

        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS social_posts (
              id SERIAL PRIMARY KEY,
              user_id TEXT REFERENCES users(id),
              content TEXT NOT NULL,
              image_url VARCHAR(255),
              likes_count INT DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS post_likes (
              post_id INTEGER REFERENCES social_posts(id),
              user_id TEXT REFERENCES users(id),
              PRIMARY KEY (post_id, user_id)
          );
        `);
      } catch (err) {
        console.error("❌ Error creando tablas en PostgreSQL:", err);
      }

      // Seed if empty
      try {
        const eventCount = await this.pool.query("SELECT COUNT(*) as count FROM events");
        if (parseInt(eventCount.rows[0].count) === 0) {
          console.log("🌱 Sembrando base de datos PostgreSQL...");
          await this.pool.query(`INSERT INTO events (id, name, lat, lng, distance, capacity) VALUES 
          ('1', 'Neon Art Drop 🍸', 19.4326, -99.1332, '0.5km', 90),
          ('2', 'Bresh Party Mexico 🪩', 19.4340, -99.1350, '1.2km', 85),
          ('3', 'Secret Rooftop (Vibe+) 🌙', 19.4300, -99.1400, '3km', 100)`);
        }
      } catch (err) {
        console.error("❌ Error en seeding de PostgreSQL:", err);
      }
    } else if (sqliteDb) {
      // SQLite
      const db = sqliteDb;
      await db.run('PRAGMA foreign_keys = OFF;');

      // --- AUTOCORRECCIÓN DE ESQUEMA (Solo para desarrollo) ---
      const tableInfo = await db.all("PRAGMA table_info(events)");
      if (tableInfo.length > 0 && !tableInfo.some((col: any) => col.name === 'name')) {
        console.log("⚠️ Esquema antiguo detectado. Reconstruyendo tablas obsoletas...");
        await db.exec(`
          DROP TABLE IF EXISTS events;
          DROP TABLE IF EXISTS matches;
          DROP TABLE IF EXISTS live_feed;
          DROP TABLE IF EXISTS stories;
          DROP TABLE IF EXISTS event_attendees;
        `);
      }

      // --- BORRADO INTELIGENTE DE USUARIOS ANTIGUOS ---
      try {
        const cols = await db.all("PRAGMA table_info(users)");
        const colNames = cols.map((c: any) => c.name);

        const ensureCol = async (name: string, def: string) => {
          if (!colNames.includes(name)) await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def};`);
        };

        await ensureCol('last_active', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        await ensureCol('google_id', 'VARCHAR(255)');
        await ensureCol('facebook_id', 'VARCHAR(255)');
        await ensureCol('phone', 'VARCHAR(20) UNIQUE');
        await ensureCol('is_blocked', 'BOOLEAN DEFAULT 0');
        await ensureCol('public_key', 'TEXT');
        await ensureCol('profile_audio_url', 'VARCHAR(255)');
        await ensureCol('is_verified', 'BOOLEAN DEFAULT 0');
        await ensureCol('is_adult_content_allowed', 'BOOLEAN DEFAULT 0');
        await ensureCol('bio', 'TEXT');
        await ensureCol('occupation', 'VARCHAR(255)');
        await ensureCol('zodiac_sign', 'VARCHAR(50)');
        await ensureCol('vibe_color', 'VARCHAR(50)');
        await ensureCol('gender', 'VARCHAR(50)');
        await ensureCol('gender_preference', 'VARCHAR(50)');
        await ensureCol('birth_date', 'DATE');
        await ensureCol('vibe_coins', 'INTEGER DEFAULT 0');
        await ensureCol('streak_days', 'INTEGER DEFAULT 0');
        await ensureCol('last_reward_claim', 'DATETIME');
        await ensureCol('spotify_id', 'VARCHAR(255)');

        // Columnas comerciales para Eventos
        const eventCols = await db.all("PRAGMA table_info(events)");
        const eventColNames = eventCols.map((c: any) => c.name);
        const ensureEventCol = async (name: string, def: string) => {
          if (!eventColNames.includes(name)) await db.exec(`ALTER TABLE events ADD COLUMN ${name} ${def};`);
        };
        await ensureEventCol('description', 'TEXT');
        await ensureEventCol('ticket_price', 'REAL DEFAULT 0');
        await ensureEventCol('lineup', 'TEXT');
        await ensureEventCol('image_url', 'VARCHAR(255)');
        await ensureEventCol('vibe', 'VARCHAR(50)');

        await db.exec(`
          DELETE FROM users
          WHERE (
            (password_hash IS NULL AND google_id IS NULL AND facebook_id IS NULL AND phone IS NULL)
            OR (created_at < DATETIME('now', '-1 year'))
          )
          AND (is_verified = 0 OR is_verified IS NULL);
        `);
      } catch (e) {
        // Ignore
      }

      // Tablas para Social Feed
      await db.exec(`
        CREATE TABLE IF NOT EXISTS social_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id),
            content TEXT NOT NULL,
            image_url VARCHAR(255),
            likes_count INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS post_likes (
            post_id INTEGER REFERENCES social_posts(id),
            user_id TEXT REFERENCES users(id),
            PRIMARY KEY (post_id, user_id)
        );
      `);

      // Carga el esquema correcto para SQLite. Asume que has renombrado 'schema.sql' a 'schema.sqlite.sql'
      let schemaPath = path.join(__dirname, '..', 'schema.sqlite.sql'); // Para cuando se ejecuta desde la carpeta 'dist'
      if (!fs.existsSync(schemaPath)) {
        schemaPath = path.join(__dirname, 'schema.sqlite.sql'); // Para cuando se ejecuta desde la raíz (ts-node)
      }
      if (!fs.existsSync(schemaPath)) return console.error('❌ FATAL: No se encontró el archivo schema.sqlite.sql. Asegúrate de renombrarlo y subirlo.');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await db.exec(schema);

      await db.run('PRAGMA foreign_keys = ON;');

      const eventCount = await db.get("SELECT COUNT(*) as count FROM events");
      if (eventCount.count === 0) {
        console.log("🌱 Sembrando base de datos con eventos e interacciones reales...");
        await db.run(`INSERT INTO events (id, name, lat, lng, distance, capacity) VALUES 
        ('1', 'Neon Art Drop 🍸', 19.4326, -99.1332, '0.5km', 90),
        ('2', 'Bresh Party Mexico', 19.4340, -99.1350, '1.2km', 85),
        ('3', 'Secret Rooftop (Vibe+)', 19.4300, -99.1400, '3km', 100)`);

        await db.run(`INSERT INTO matches (id, user_a, user_b, matched_name, matched_age, synergy, common_interest, event_id) VALUES 
        ('m1', 'all', 'u1', 'Ana', 24, 94, 'Bad Bunny (Spotify) & Signos de Fuego (Co-Star)', '1'),
        ('m2', 'all', 'u2', 'Carlos', 27, 88, 'Siguen a las mismas cuentas en Instagram y TikTok', '2')`);

        await db.run(`INSERT INTO live_feed (id, time_text, content, type) VALUES 
        ('f1', 'Hace 1 min', '🎟️ Las entradas VIP para Bresh están por agotarse', 'hot'),
        ('f2', 'Hace 3 min', '📸 Alguien de tus contactos mutuos de IG se unió a Vibe', 'match'),
        ('f3', 'Hace 10 min', '✨ Tienes 2 nuevos "Likes" secretos (Sube a Vibe+ para verlos)', 'hot')`);

        await db.run(`INSERT INTO stories (id, title, is_live) VALUES 
        ('s1', 'Bresh Live 🪩', 1),
        ('s2', 'Afterparty 🍸', 0),
        ('s3', 'Neon Drop 🎨', 1),
        ('s4', 'Rooftop Chill', 0)`);
      }
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
        throw error;
      }
    }
  }
}

export const db = new LocalDB();
