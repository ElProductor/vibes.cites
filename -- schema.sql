-- schema.sql

-- 1. Usuarios y sus "Valores Críticos" (Hard Constraints)
-- Estos datos se llenan ANTES de ver cualquier perfil.
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- UUID generado en código
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    birth_date TEXT NOT NULL, -- SQLite usa TEXT para fechas ISO
    gender VARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER')),
    gender_preference VARCHAR(20) DEFAULT 'EVERYONE', -- 'MALE', 'FEMALE', 'EVERYONE'
    bio TEXT,
    occupation VARCHAR(100),
    education VARCHAR(100),
    height_cm INT,
    zodiac_sign VARCHAR(20),
    location_lat DECIMAL(9,6),
    location_long DECIMAL(9,6),
    vibe_score INT DEFAULT 100, -- Sistema de reputación (gamificación)
    vibe_color VARCHAR(50), -- Color del aura detectado al inicio (HSL)
    profile_audio_url VARCHAR(255), -- Prioridad a la voz (Interacción Asíncrona)
    is_verified BOOLEAN DEFAULT 0, -- SQLite usa 0/1 para booleanos
    is_adult_content_allowed BOOLEAN DEFAULT 0, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_critical_values (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    political_view VARCHAR(20) CHECK (political_view IN ('LIBERAL', 'CONSERVATIVE', 'CENTRIST', 'APOLITICAL')),
    religion VARCHAR(20) CHECK (religion IN ('ATHEIST', 'CHRISTIAN', 'MUSLIM', 'JEWISH', 'SPIRITUAL', 'OTHER')),
    family_plans VARCHAR(20) CHECK (family_plans IN ('WANTS_KIDS', 'NO_KIDS', 'HAS_KIDS', 'UNDECIDED')),
    lifestyle VARCHAR(20) CHECK (lifestyle IN ('PARTY', 'OUTDOORS', 'HOMEBODY', 'BALANCED')),
    smoking VARCHAR(20) CHECK (smoking IN ('YES', 'NO', 'SOCIALLY', 'TRYING_TO_QUIT')),
    drinking VARCHAR(20) CHECK (drinking IN ('YES', 'NO', 'SOCIALLY')),
    cannabis VARCHAR(20) CHECK (cannabis IN ('YES', 'NO', 'SOCIALLY')),
    pets VARCHAR(20) CHECK (pets IN ('HAS_DOG', 'HAS_CAT', 'HAS_OTHER', 'WANTS_PETS', 'NO_PETS', 'ALLERGIC')),
    love_language VARCHAR(50), -- Ej: 'WORDS_OF_AFFIRMATION'
    personality_type VARCHAR(10), -- Ej: 'ENFP'
    communication_style VARCHAR(50), -- Ej: 'DIRECT', 'PASSIVE', 'REFLECTIVE'
    -- El "Anti-Bio": Lo que no toleran
    deal_breaker VARCHAR(255), -- Ej: "No soporto a la gente que fuma"
    red_flags TEXT, -- JSON String en SQLite
    green_flags TEXT -- JSON String en SQLite
);

-- 1.1 Favoritos y Gustos (La "Ventana" de intereses)
CREATE TABLE user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    category VARCHAR(50) CHECK (category IN ('MUSIC_GENRE', 'BAND', 'MOVIE', 'ACTOR', 'BOOK', 'FOOD', 'HOBBY')),
    item_value VARCHAR(255) NOT NULL
);

-- 1.2 Galería de Fotos
CREATE TABLE user_photos (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    photo_url VARCHAR(255) NOT NULL,
    photo_data TEXT, -- ALMACENAMIENTO LOCAL: Guardamos el Base64 aquí para ser "real y funcional" sin S3
    is_primary BOOLEAN DEFAULT 0,
    is_nsfw BOOLEAN DEFAULT 0, -- Flag para contenido +18
    caption VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Eventos (El corazón de la app)
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- Ej: 'HIKING', 'WINE_TASTING', 'CODING_WORKSHOP'
    capacity INT DEFAULT 6, -- Micro-eventos por defecto
    event_date DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN' -- OPEN, FULL, COMPLETED
);

CREATE TABLE event_attendees (
    event_id TEXT REFERENCES events(id),
    user_id TEXT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'CONFIRMED',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

-- 3. Sistema de "Cero Presión" para Video/Chat
-- Tabla de doble entrada ciega.
CREATE TABLE interaction_consent (
    actor_user_id TEXT REFERENCES users(id),
    target_user_id TEXT REFERENCES users(id),
    consent_type VARCHAR(20) CHECK (consent_type IN ('VIDEO_CALL', 'SHARE_PHONE', 'ONE_ON_ONE_DATE')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_user_id, target_user_id, consent_type)
);

-- 4. Chat y Mensajería (Asíncrona prioritaria)
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES users(id),
    receiver_id TEXT REFERENCES users(id),
    content TEXT, -- Puede ser texto o URL de audio
    message_type VARCHAR(20) DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'AUDIO', 'IMAGE', 'PROMPT_ANSWER')),
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Prompts Creativos (Para romper el hielo)
CREATE TABLE conversation_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    category VARCHAR(50) -- 'FUN', 'DEEP', 'HYPOTHETICAL'
);

-- 6. Moderación y Seguridad
CREATE TABLE blocked_users (
    blocker_id TEXT REFERENCES users(id),
    blocked_id TEXT REFERENCES users(id),
    reason VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id)
);

-- 7. Reacciones en Chat
CREATE TABLE message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT REFERENCES chat_messages(id),
    user_id TEXT REFERENCES users(id),
    reaction_emoji VARCHAR(10), -- Ej: '❤️', '😂'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Historial de Vibe Score (Auditoría de Comportamiento)
CREATE TABLE vibe_score_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    change_amount INT NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'ATTENDED_EVENT', 'NO_SHOW', 'LATE', 'REPORTED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Verificación de Identidad Estricta
CREATE TABLE user_verifications (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    id_front_data TEXT NOT NULL, -- Foto Carnet Frente (Base64)
    id_back_data TEXT NOT NULL, -- Foto Carnet Dorso (Base64)
    biometric_face_data TEXT NOT NULL, -- Escaneo Facial
    verification_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED'
    extracted_dob TEXT, -- Fecha de nacimiento extraída por OCR (Simulado)
    verified_at DATETIME
);

-- 10. Sistema de Insignias (Gamificación)
CREATE TABLE badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    icon_url VARCHAR(255),
    required_score INT DEFAULT 0,
    required_events INT DEFAULT 0,
    category VARCHAR(20) -- 'SOCIAL', 'PUNCTUALITY', 'VIBE'
);

CREATE TABLE user_badges (
    user_id TEXT REFERENCES users(id),
    badge_id INT REFERENCES badges(id),
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id)
);

-- 12. Notificaciones (Agregado del seed)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT,
    payload TEXT, -- JSONB -> TEXT
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Índices para Optimización (Gestión Integral DB)
CREATE INDEX idx_users_vibe_score ON users(vibe_score);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
