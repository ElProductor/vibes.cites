-- schema.sql
-- ARQUITECTURA MAESTRA VIBE (Sincronizada)

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE,
    public_key TEXT,
    birth_date TEXT,
    gender VARCHAR(20),
    gender_preference VARCHAR(20) DEFAULT 'EVERYONE',
    bio TEXT,
    occupation VARCHAR(100),
    education VARCHAR(100),
    height_cm INT,
    zodiac_sign VARCHAR(20),
    location_lat DECIMAL(9,6),
    location_long DECIMAL(9,6),
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    vibe_score INT DEFAULT 100,
    vibe_color VARCHAR(50),
    profile_audio_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT 0,
    is_adult_content_allowed BOOLEAN DEFAULT 0,
    is_blocked BOOLEAN DEFAULT 0,
    is_admin BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL,
    lng REAL,
    distance TEXT,
    capacity TEXT,
    activity_type VARCHAR(50),
    event_date DATETIME,
    status VARCHAR(20) DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    user_a TEXT,
    user_b TEXT,
    matched_name TEXT,
    matched_age INTEGER,
    synergy INTEGER,
    common_interest TEXT,
    event_id TEXT
);

CREATE TABLE IF NOT EXISTS live_feed (
    id TEXT PRIMARY KEY,
    time_text TEXT,
    content TEXT,
    type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT,
    is_live BOOLEAN
);

CREATE TABLE IF NOT EXISTS event_attendees (
    event_id TEXT REFERENCES events(id),
    user_id TEXT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'CONFIRMED',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_critical_values (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    political_view VARCHAR(20),
    religion VARCHAR(20),
    family_plans VARCHAR(20),
    lifestyle VARCHAR(20),
    smoking VARCHAR(20),
    drinking VARCHAR(20),
    cannabis VARCHAR(20),
    pets VARCHAR(20),
    love_language VARCHAR(50),
    personality_type VARCHAR(10),
    communication_style VARCHAR(50),
    deal_breaker VARCHAR(255),
    red_flags TEXT,
    green_flags TEXT
);

CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    category VARCHAR(50),
    item_value VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_photos (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    photo_url VARCHAR(255) NOT NULL,
    photo_data TEXT,
    is_primary BOOLEAN DEFAULT 0,
    is_nsfw BOOLEAN DEFAULT 0,
    caption VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES users(id),
    receiver_id TEXT REFERENCES users(id),
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'TEXT',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interaction_consent (
    actor_user_id TEXT REFERENCES users(id),
    target_user_id TEXT REFERENCES users(id),
    consent_type VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_user_id, target_user_id, consent_type)
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT REFERENCES users(id),
    badge_id INT REFERENCES badges(id),
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    icon_url VARCHAR(255),
    required_score INT DEFAULT 0,
    required_events INT DEFAULT 0,
    category VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT,
    payload TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vibe_score_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    change_amount INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Alta Velocidad (Seguros contra duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_vibe_score ON users(vibe_score);