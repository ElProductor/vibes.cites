-- seed.sql


-- 2. Asegurar restricción única para Badges (necesario para el seed dinámico)
-- En SQLite se hace al crear la tabla o con un índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_name ON badges(name);

-- 3. Seed de Badges (Upsert: Insertar o Actualizar si existe)
INSERT INTO badges (name, description, icon_url, required_score, required_events, category)
VALUES 
('Early Bird', 'Llega temprano a 3 eventos seguidos', 'https://vibe.app/icons/early_bird.png', 0, 3, 'PUNCTUALITY'),
('Socialite', 'Asiste a 10 eventos', 'https://vibe.app/icons/socialite.png', 0, 10, 'SOCIAL'),
('Vibe Master', 'Alcanza 500 puntos de Vibe Score', 'https://vibe.app/icons/vibe_master.png', 500, 0, 'VIBE'),
('Icebreaker', 'Envía el primer mensaje en 5 chats', 'https://vibe.app/icons/icebreaker.png', 0, 0, 'SOCIAL'),
('Host with the Most', 'Organiza 3 eventos exitosos', 'https://vibe.app/icons/host.png', 0, 0, 'SOCIAL'),
('Reliable', 'Sin "No Shows" en los últimos 20 eventos', 'https://vibe.app/icons/reliable.png', 200, 20, 'PUNCTUALITY'),
('Night Owl', 'Asiste a 5 eventos nocturnos', 'https://vibe.app/icons/night_owl.png', 0, 5, 'SOCIAL'),
('Adventurer', 'Prueba 3 tipos de actividades diferentes', 'https://vibe.app/icons/adventurer.png', 0, 3, 'SOCIAL'),
('Verified Vibe', 'Completa la verificación de identidad', 'https://vibe.app/icons/verified.png', 50, 0, 'VIBE'),
('Community Pillar', 'Recibe 50 reportes positivos', 'https://vibe.app/icons/pillar.png', 800, 0, 'VIBE')
ON CONFLICT(name) DO UPDATE 
SET description = EXCLUDED.description, 
    required_score = EXCLUDED.required_score, 
    required_events = EXCLUDED.required_events,
    icon_url = EXCLUDED.icon_url;

-- 4. Seed de Prompts de Conversación
INSERT INTO conversation_prompts (question_text, category)
VALUES
('Si pudieras cenar con cualquier personaje histórico, ¿quién sería?', 'HYPOTHETICAL'),
('¿Cuál es tu opinión impopular sobre la comida?', 'FUN'),
('¿Qué es lo que más valoras en una amistad?', 'DEEP')
;
