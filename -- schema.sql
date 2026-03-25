-- schema.sql
-- Esquema compatible con PostgreSQL para VIBE

-- 1. Usuarios y Datos Principales
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- UUID generado en código
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE, -- Nulo si se registra solo con teléfono
    phone VARCHAR(50) UNIQUE, -- Nulo si se registra solo con email
    password_hash VARCHAR(255), -- Nulo para logins sociales o sin contraseña
    birth_date DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER')),
    gender_preference VARCHAR(20) DEFAULT 'EVERYONE' CHECK (gender_preference IN ('MALE', 'FEMALE', 'EVERYONE')),
    bio TEXT,
    occupation VARCHAR(100),
    education VARCHAR(100),
    height_cm INT,
    zodiac_sign VARCHAR(20),
    location_lat DECIMAL(9,6),
    location_long DECIMAL(9,6),
    vibe_score INT DEFAULT 100,
    vibe_color VARCHAR(50),
    profile_audio_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_adult_content_allowed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Campos para Login Social, E2EE y Admin
    google_id VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE,
    public_key TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    -- Se asegura de que al menos el email o el teléfono existan
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Valores Críticos (Deal-breakers)
CREATE TABLE user_critical_values (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    political_view VARCHAR(20) CHECK (political_view IN ('LIBERAL', 'CONSERVATIVE', 'CENTRIST', 'APOLITICAL')),
    religion VARCHAR(20) CHECK (religion IN ('ATHEIST', 'CHRISTIAN', 'MUSLIM', 'JEWISH', 'SPIRITUAL', 'OTHER')),
    family_plans VARCHAR(20) CHECK (family_plans IN ('WANTS_KIDS', 'NO_KIDS', 'HAS_KIDS', 'UNDECIDED')),
    lifestyle VARCHAR(20) CHECK (lifestyle IN ('PARTY', 'OUTDOORS', 'HOMEBODY', 'BALANCED')),
    smoking VARCHAR(20) CHECK (smoking IN ('YES', 'NO', 'SOCIALLY', 'TRYING_TO_QUIT')),
    drinking VARCHAR(20) CHECK (drinking IN ('YES', 'NO', 'SOCIALLY')),
    cannabis VARCHAR(20) CHECK (cannabis IN ('YES', 'NO', 'SOCIALLY')),
    pets VARCHAR(20) CHECK (pets IN ('HAS_DOG', 'HAS_CAT', 'HAS_OTHER', 'WANTS_PETS', 'NO_PETS', 'ALLERGIC')),
    love_language VARCHAR(50),
    personality_type VARCHAR(10),
    communication_style VARCHAR(50),
    deal_breaker VARCHAR(255),
    red_flags JSONB, -- Usamos JSONB nativo de Postgres
    green_flags JSONB
);

-- Favoritos y Gustos
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) CHECK (category IN ('MUSIC_GENRE', 'BAND', 'MOVIE', 'ACTOR', 'BOOK', 'FOOD', 'HOBBY')),
    item_value VARCHAR(255) NOT NULL
);

-- Galería de Fotos (Preparada para URLs de Supabase/S3)
CREATE TABLE user_photos (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    caption VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Eventos
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- Ej: 'HIKING', 'WINE_TASTING', 'CODING_WORKSHOP'
    capacity INT DEFAULT 6,
    event_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULL', 'COMPLETED', 'CANCELLED'))
);

CREATE TABLE event_attendees (
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'CONFIRMED',
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

-- Consentimiento de Interacción
CREATE TABLE interaction_consent (
    actor_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    target_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(20) CHECK (consent_type IN ('VIDEO_CALL', 'SHARE_PHONE', 'ONE_ON_ONE_DATE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_user_id, target_user_id, consent_type)
);

-- Chat y Mensajería
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'AUDIO', 'IMAGE', 'PROMPT_ANSWER')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Prompts de Conversación
CREATE TABLE conversation_prompts (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    category VARCHAR(50)
);

-- Moderación y Seguridad
CREATE TABLE blocked_users (
    blocker_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    blocked_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Reacciones en Chat
CREATE TABLE message_reactions (
    id SERIAL PRIMARY KEY,
    message_id TEXT REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    reaction_emoji VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Historial de Vibe Score
CREATE TABLE vibe_score_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    change_amount INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Verificación de Identidad
CREATE TABLE user_verifications (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    id_front_data TEXT NOT NULL,
    id_back_data TEXT NOT NULL,
    biometric_face_data TEXT NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    extracted_dob TEXT,
    verified_at TIMESTAMPTZ
);

-- Sistema de Insignias
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    icon_url VARCHAR(255),
    required_score INT DEFAULT 0,
    required_events INT DEFAULT 0,
    category VARCHAR(20)
);

CREATE TABLE user_badges (
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    badge_id INT REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id)
);

-- Notificaciones
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT,
    payload JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para Optimización
CREATE INDEX idx_users_vibe_score ON users(vibe_score DESC);
CREATE INDEX idx_events_event_date ON events(event_date DESC);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
