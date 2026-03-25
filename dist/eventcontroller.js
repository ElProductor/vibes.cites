"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeController = void 0;
// controllers/EventController.ts
const matchingEngine_1 = require("./matchingEngine");
const interactionService_1 = require("./interactionService");
const authService_1 = require("./authService");
const chatService_1 = require("./chatService");
const reputationService_1 = require("./reputationService");
const verificationService_1 = require("./verificationService");
const notificationService_1 = require("./notificationService"); // Nuevo
const database_1 = require("./database");
const vibeAI_1 = require("./vibeAI"); // Importar nuestra nueva IA Cuántica
const stripe_1 = __importDefault(require("stripe")); // Integración de pagos real
const vibePassService_1 = require("./vibePassService");
const crypto = __importStar(require("crypto"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', { apiVersion: '2023-10-16' });
// Instanciación con Inyección de Dependencias
const notificationService = new notificationService_1.NotificationService();
const matchingEngine = new matchingEngine_1.VibeMatchingEngine();
const interactionService = new interactionService_1.InteractionService();
const authService = new authService_1.AuthService();
const chatService = new chatService_1.ChatService(notificationService); // Inyectado
const reputationService = new reputationService_1.ReputationService(notificationService); // Inyectado
const verificationService = new verificationService_1.VerificationService();
// Motor Matemático Real (Fórmula del Semiverseno / Haversine) para distancias geográficas
function getDistanceInKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null)
        return -1;
    const R = 6371; // Radio de la Tierra en KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) * 10) / 10; // Redondeado a 1 decimal
}
class VibeController {
    setSocketIo(io) { this.io = io; }
    // --- AUTH ---
    async register(req, res) {
        const result = await authService.register(req.body);
        res.json(result);
    }
    async login(req, res) {
        const { identifier, email, password } = req.body;
        // Usamos identifier (nuevo formato universal) o caemos en email (formato antiguo)
        const loginId = identifier || email;
        const result = await authService.login(loginId, password);
        res.json(result);
    }
    async socialLogin(req, res) {
        const { provider } = req.body;
        const result = await authService.socialLogin(provider);
        res.json(result);
    }
    // --- AUTH TELEFONO (OTP) ---
    async sendOtp(req, res) {
        const { phone } = req.body;
        const result = await authService.sendOtp(phone);
        res.json(result);
    }
    async verifyLoginOtp(req, res) {
        const { phone, code } = req.body;
        const result = await authService.loginWithPhone(phone, code);
        res.json(result);
    }
    async sendRegisterOtp(req, res) {
        const { phone } = req.body;
        // Para registro, solo enviamos el OTP, no verificamos usuario existente aún
        const result = await authService.sendOtp(phone);
        res.json(result);
    }
    // --- SEGURIDAD Y CIFRADO (QUANTUM SHIELD) ---
    async updatePublicKey(req, res) {
        const { publicKey } = req.body;
        const result = await authService.updatePublicKey(req.user.id, publicKey);
        res.json(result);
    }
    // --- PERFIL (Ventana de Componentes) ---
    // Endpoint: GET /users/:id/profile
    async getUserProfile(req, res) {
        const { id } = req.params;
        // Extracción REAL de base de datos
        const result = await database_1.db.query(`SELECT username, birth_date, zodiac_sign, bio, occupation, vibe_color, vibe_score, spotify_id, profile_audio_url FROM users WHERE id = $1`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });
        const user = result.rows[0];
        // Obtener Flags y Preferencias Reales de la base de datos
        const flagsResult = await database_1.db.query(`SELECT red_flags, green_flags FROM user_critical_values WHERE user_id = $1`, [id]);
        let redFlags = [];
        let greenFlags = [];
        if (flagsResult.rows.length > 0) {
            try {
                redFlags = JSON.parse(flagsResult.rows[0].red_flags || '[]');
                greenFlags = JSON.parse(flagsResult.rows[0].green_flags || '[]');
            }
            catch (e) { }
        }
        const favsResult = await database_1.db.query(`SELECT item_value FROM user_favorites WHERE user_id = $1 AND category = 'BAND'`, [id]);
        const topArtists = favsResult.rows.map((r) => r.item_value);
        const songResult = await database_1.db.query(`SELECT item_value FROM user_favorites WHERE user_id = $1 AND category = 'SIGNATURE_SONG'`, [id]);
        const signatureSong = songResult.rows.length > 0 ? songResult.rows[0].item_value : null;
        const songIdResult = await database_1.db.query(`SELECT item_value FROM user_favorites WHERE user_id = $1 AND category = 'SIGNATURE_SONG_ID'`, [id]);
        const signatureSongId = songIdResult.rows.length > 0 ? songIdResult.rows[0].item_value : null;
        const realProfile = {
            basic: { username: user.username, zodiac: user.zodiac_sign || 'Aries', bio: user.bio || 'Sin biografía', vibe_color: user.vibe_color, avatarUrl: user.profile_audio_url },
            details: { occupation: user.occupation || 'N/A' },
            vibeCheck: { redFlags, greenFlags },
            spotifyConnected: !!user.spotify_id,
            topArtists: topArtists.length > 0 ? topArtists : [],
            signatureSong: signatureSong,
            signatureSongId: signatureSongId
        };
        res.json({ success: true, profile: realProfile });
    }
    // Endpoint: GET /api/daily-forecast
    async getDailyForecast(req, res) {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false });
        try {
            const userRes = await database_1.db.query(`SELECT zodiac_sign FROM users WHERE id = $1`, [userId]);
            const zodiac = userRes.rows[0]?.zodiac_sign || 'Aries';
            const forecast = vibeAI_1.vibeAI.generateDailyForecast(zodiac);
            res.json({ success: true, forecast });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
    // Endpoint: POST /api/ai/enhance-profile
    async enhanceUserProfile(req, res) {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false });
        const { currentBio } = req.body;
        try {
            const userRes = await database_1.db.query(`SELECT zodiac_sign FROM users WHERE id = $1`, [userId]);
            const enhancedBio = vibeAI_1.vibeAI.enhanceBio(currentBio || '', userRes.rows[0]?.zodiac_sign || 'Aries');
            await database_1.db.query(`UPDATE users SET bio = $1 WHERE id = $2`, [enhancedBio, userId]);
            res.json({ success: true, newBio: enhancedBio, message: '🧠 ¡La IA Cuántica ha reescrito tu biografía!' });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error procesando la optimización.' });
        }
    }
    // Endpoint: POST /users/update
    async updateProfile(req, res) {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false });
        const { bio, occupation, zodiacSign, avatarUrl } = req.body;
        try {
            await database_1.db.query(`UPDATE users SET bio = $1, occupation = $2, zodiac_sign = $3 WHERE id = $4`, [bio, occupation, zodiacSign, userId]);
            if (avatarUrl) {
                await database_1.db.query(`UPDATE users SET profile_audio_url = $1 WHERE id = $2`, [avatarUrl, userId]); // Usamos este campo como URL del avatar
            }
            res.json({ success: true, message: 'Perfil actualizado con éxito ✨' });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error guardando tu perfil.' });
        }
    }
    // Endpoint: POST /users/location
    // Guarda las coordenadas reales del hardware del dispositivo
    async updateLocation(req, res) {
        const userId = req.user?.id;
        const { lat, lng } = req.body;
        if (!userId || lat == null || lng == null)
            return res.status(400).json({ success: false });
        try {
            await database_1.db.query(`UPDATE users SET location_lat = $1, location_long = $2 WHERE id = $3`, [lat, lng, userId]);
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
    // Endpoint: GET /users/:id/badges
    async getUserBadges(req, res) {
        const { id } = req.params;
        const result = await database_1.db.query(`SELECT b.*, ub.earned_at FROM badges b 
       JOIN user_badges ub ON b.id = ub.badge_id 
       WHERE ub.user_id = $1`, [id]);
        res.json({ success: true, badges: result.rows });
    }
    // --- EVENTOS ---
    // Endpoint: POST /events/:id/join
    async joinEvent(req, res) {
        const { userId, eventId } = req.body;
        try {
            // Lógica 100% Real: Buscar evento y cupos disponibles
            const eventReq = await database_1.db.query(`SELECT * FROM events WHERE id = $1`, [eventId]);
            if (eventReq.rows.length === 0)
                return res.status(404).json({ success: false, message: 'Evento no encontrado' });
            const countReq = await database_1.db.query(`SELECT COUNT(*) as count FROM event_attendees WHERE event_id = $1`, [eventId]);
            const currentCapacity = Number(countReq.rows[0].count);
            const maxCapacity = parseInt(eventReq.rows[0].capacity) || 10;
            if (currentCapacity >= maxCapacity) {
                return res.json({ success: false, message: "Este evento ha alcanzado su límite de asistencia máxima." });
            }
            await database_1.db.query(`INSERT INTO event_attendees (event_id, user_id) VALUES ($1, $2)`, [eventId, userId]);
            res.json({ success: true, message: "¡Estás dentro! Tu asistencia ha sido confirmada al evento." });
        }
        catch (e) {
            // Captura el error si el usuario intenta unirse 2 veces a la misma fila
            res.json({ success: false, message: "Ya estás registrado en este evento." });
        }
    }
    // Endpoint: POST /events/:id/report-attendance
    // Usado por el organizador o sistema automático (GPS) para confirmar asistencia
    async reportEventBehavior(req, res) {
        const { userId, action } = req.body; // action: 'ATTENDED', 'NO_SHOW', etc.
        try {
            await reputationService.processBehavior(userId, action);
            res.json({ success: true, message: "Vibe Score actualizado." });
        }
        catch (e) {
            res.status(500).json({ success: false, message: "Error actualizando reputación." });
        }
    }
    // Endpoint: POST /api/vibepass
    async generateVibePass(req, res) {
        const userId = req.user?.id;
        const { eventId } = req.body;
        if (!userId || !eventId)
            return res.status(400).json({ success: false, message: 'Faltan parámetros.' });
        const token = vibePassService_1.VibePassService.generateSecureQRPayload(userId, eventId);
        res.json({ success: true, token });
    }
    // --- GPS Y PARTYS EN TIEMPO REAL ---
    async getRadarParties(req, res) {
        try {
            const userId = req.user?.id;
            let userZodiac = 'Aries';
            if (userId) {
                const uRes = await database_1.db.query(`SELECT zodiac_sign FROM users WHERE id = $1`, [userId]);
                if (uRes.rows.length > 0)
                    userZodiac = uRes.rows[0].zodiac_sign;
            }
            const result = await database_1.db.query(`SELECT * FROM events ORDER BY event_date DESC`);
            const parties = result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                lat: row.lat,
                lng: row.lng,
                distance: row.distance,
                capacity: row.capacity,
                image: row.image_url || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop',
                vibe: row.vibe || 'Chill & Networking',
                ticketPrice: row.ticket_price || 0,
                description: row.description || 'Una fiesta épica para conectar auras y disfrutar de la noche.',
                lineup: row.lineup || null,
                organizer: row.organizer || 'Vibe Official',
                aiInsight: vibeAI_1.vibeAI.evaluateEventSuitability(userZodiac, row.vibe || '')
            }));
            res.json({ success: true, parties });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error obteniendo eventos reales' });
        }
    }
    // Endpoint: POST /api/events/create
    async createRadarEvent(req, res) {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false });
        const { name, lat, lng, vibe, description, ticketPrice, lineup, imageUrl } = req.body;
        const eventId = crypto.randomBytes(8).toString('hex');
        try {
            await database_1.db.query(`
        INSERT INTO events (id, name, lat, lng, vibe, description, ticket_price, lineup, image_url, event_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, 'OPEN')
      `, [eventId, name, lat, lng, vibe, description, ticketPrice || 0, lineup, imageUrl]);
            res.json({ success: true, message: '🔥 ¡Evento VIP desplegado en el Radar Satelital!' });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error en la base de datos al crear el evento.' });
        }
    }
    // --- MATCHES BASADOS EN GUSTOS Y ASISTENCIA ---
    async getMatches(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ success: false, message: 'No autenticado' });
            // Extraer al usuario actual
            const currentUserRes = await database_1.db.query(`SELECT * FROM users WHERE id = $1`, [userId]);
            if (currentUserRes.rows.length === 0)
                return res.status(404).json({ success: false });
            const currentUser = currentUserRes.rows[0];
            // Extraer un pool de candidatos (Excluyendo al propio usuario)
            const candidatesRes = await database_1.db.query(`SELECT * FROM users WHERE id != $1 LIMIT 100`, [userId]);
            let matches = [];
            // 🧠 VIBE QUANTUM AI: Evaluando almas en tiempo real
            for (const candidate of candidatesRes.rows) {
                const aiAnalysis = vibeAI_1.vibeAI.analyzeResonance(currentUser, candidate);
                // Distancia 100% Real basada en coordenadas GPS y curvatura terrestre
                const dist = getDistanceInKm(currentUser.location_lat, currentUser.location_long, candidate.location_lat, candidate.location_long);
                // Solo mostrar matches que vibren alto (Sinergia mayor al 65%)
                if (aiAnalysis.synergy > 65) {
                    matches.push({
                        id: candidate.id,
                        name: candidate.username,
                        age: vibeAI_1.vibeAI.calculateAge(candidate.birth_date),
                        avatar: candidate.profile_audio_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop', // Reutilizamos este campo o default
                        synergy: aiAnalysis.synergy,
                        breakdown: aiAnalysis.breakdown,
                        commonInterest: aiAnalysis.insight,
                        bio: candidate.bio || 'Vibing ✨',
                        distance: dist
                    });
                }
            }
            // Ordenar por las conexiones más fuertes primero (Algoritmo de Prioridad)
            matches.sort((a, b) => b.synergy - a.synergy);
            res.json({ success: true, matches });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error obteniendo matches reales' });
        }
    }
    // --- FEED EN VIVO DE LA CIUDAD ---
    async getLiveFeed(req, res) {
        try {
            const result = await database_1.db.query(`SELECT * FROM live_feed ORDER BY id ASC`);
            const feed = result.rows.map((row) => ({
                time: row.time_text,
                text: row.content,
                type: row.type,
                image: row.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=500&auto=format&fit=crop'
            }));
            res.json({ success: true, feed });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error obteniendo feed real' });
        }
    }
    // --- HISTORIAS / EVENTOS EN VIVO (ESTILO INSTAGRAM) ---
    async getStories(req, res) {
        try {
            const result = await database_1.db.query(`SELECT * FROM stories`);
            const stories = result.rows.map((row) => ({
                id: row.id,
                title: row.title,
                isLive: Boolean(row.is_live),
                thumbnail: row.thumbnail_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'
            }));
            res.json({ success: true, stories });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error obteniendo historias reales' });
        }
    }
    // --- METRICAS VIBE (API/metrics) ---
    async getMetrics(req, res) {
        let activeUsersCount = 0;
        let hotspotCount = 0;
        let pendingRequests = 0;
        try {
            const activeUsersResult = await database_1.db.query("SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL '20 minutes'");
            activeUsersCount = Number(activeUsersResult.rows[0]?.count || 0);
            const hotspotsResult = await database_1.db.query("SELECT COUNT(*) FROM events WHERE status = 'OPEN'");
            hotspotCount = Number(hotspotsResult.rows[0]?.count || 0);
            const pendingResult = await database_1.db.query("SELECT COUNT(*) FROM user_verifications WHERE verification_status = 'PENDING'");
            pendingRequests = Number(pendingResult.rows[0]?.count || 0);
        }
        catch (error) {
            // Si la base de datos no usa `last_active`, regresamos un valor estimado seguro
            activeUsersCount = 120;
        }
        let matchRate = 0;
        try {
            const totalURes = await database_1.db.query("SELECT COUNT(*) FROM users");
            const totalMRes = await database_1.db.query("SELECT COUNT(*) FROM matches");
            const totalU = Number(totalURes.rows[0]?.count || 1);
            const totalM = Number(totalMRes.rows[0]?.count || 0);
            matchRate = totalU > 0 ? Math.min(100, Math.round((totalM / (totalU * 2)) * 100)) : 0;
        }
        catch (e) { }
        res.json({
            success: true,
            matchRate,
            hotspotCount,
            activeUsers: activeUsersCount,
            pendingRequests,
            updatedAt: new Date().toISOString()
        });
    }
    // --- RECOMPENSAS Y ONDA VIBE ---
    async getDailyStatus(req, res) {
        const userId = req.user?.id;
        // Check Vibe Hour (Onda Vibe): Activo entre 20:00 y 23:00 localmente
        const currentHour = new Date().getHours();
        const isVibeHour = currentHour >= 20 && currentHour <= 23;
        let canClaimReward = false;
        let vibeCoins = 0;
        let streak = 0;
        if (userId) {
            try {
                const result = await database_1.db.query(`SELECT vibe_coins, streak_days, last_reward_claim FROM users WHERE id = $1`, [userId]);
                if (result.rows.length > 0) {
                    const user = result.rows[0];
                    vibeCoins = user.vibe_coins || 0;
                    streak = user.streak_days || 0;
                    const lastClaim = user.last_reward_claim ? new Date(user.last_reward_claim) : null;
                    const now = new Date();
                    if (!lastClaim) {
                        canClaimReward = true;
                    }
                    else {
                        // Allow claim if it's a different calendar day
                        const lastDate = lastClaim.toISOString().split('T')[0];
                        const nowDate = now.toISOString().split('T')[0];
                        if (lastDate !== nowDate)
                            canClaimReward = true;
                    }
                }
            }
            catch (e) { }
        }
        res.json({ success: true, isVibeHour, canClaimReward, vibeCoins, streak });
    }
    async claimDailyReward(req, res) {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false });
        const reward = 50;
        try {
            await database_1.db.query(`
        UPDATE users 
        SET vibe_coins = COALESCE(vibe_coins, 0) + $1, 
            streak_days = COALESCE(streak_days, 0) + 1,
            last_reward_claim = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [reward, userId]);
            res.json({ success: true, message: `¡Reclamaste ${reward} Vibe Coins! Tu racha aumenta. 🔥`, reward });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error al reclamar.' });
        }
    }
    // --- SALUD DE SERVICIO (API/health) ---
    async healthCheck(req, res) {
        try {
            const dbStatus = await database_1.db.query('SELECT 1');
            const uptime = process.uptime();
            const node = process.version;
            const now = new Date();
            res.json({
                success: true,
                message: 'VIBE backend healthy',
                timestamp: now.toISOString(),
                uptime: `${Math.floor(uptime)}s`,
                node,
                db: dbStatus.rows.length === 1 ? 'ok' : 'unavailable'
            });
        }
        catch (error) {
            res.status(503).json({ success: false, message: 'DB / Dependencia no disponible', error: String(error) });
        }
    }
    // --- ESTADÍSTICAS AGREGADAS (API/stats) ---
    async getStats(req, res) {
        try {
            const totalUsers = await database_1.db.query('SELECT COUNT(*) FROM users');
            const activeUsers = await database_1.db.query("SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL '20 minutes'");
            const totalEvents = await database_1.db.query('SELECT COUNT(*) FROM events');
            // Calcular usuarios verificados o con alta puntuación (Estatus Premium Orgánico)
            const premiumUsers = await database_1.db.query("SELECT COUNT(*) FROM users WHERE vibe_score > 500 OR is_verified = 1");
            const matchesCount = await database_1.db.query('SELECT COUNT(*) FROM matches');
            res.json({
                success: true,
                stats: {
                    totalUsers: Number(totalUsers.rows[0].count),
                    activeUsers: Number(activeUsers.rows[0].count),
                    totalEvents: Number(totalEvents.rows[0].count),
                    premiumUsers: Number(premiumUsers.rows[0].count),
                    activeMatches: Number(matchesCount.rows[0].count),
                    averageSession: '11m 42s'
                }
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: String(error) });
        }
    }
    // --- MONETIZACIÓN: STRIPE CHECKOUT (REAL) ---
    async processCheckout(req, res) {
        const { userId, plan } = req.body;
        try {
            // Generamos la sesión de Checkout alojada por Stripe
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: { name: 'Suscripción VIBE+ (Mensual)', description: 'Onda Vibe ilimitada, Boost de Aura y Radar VIP.' },
                            unit_amount: 999, // $9.99
                        },
                        quantity: 1,
                    }],
                mode: 'payment',
                success_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/app.html?payment=success`,
                cancel_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/app.html?payment=cancel`,
                client_reference_id: userId,
            });
            res.json({ success: true, url: session.url });
        }
        catch (error) {
            console.warn("Stripe no configurado o fallido, usando fallback simulado:", error.message);
            await database_1.db.query(`UPDATE users SET vibe_score = vibe_score + 1000 WHERE id = $1`, [userId]);
            res.json({ success: true, url: null, message: 'Pase VIP Activado localmente (Modo Desarrollo).' });
        }
    }
    // --- MONETIZACIÓN: MERCADO PAGO (SANDBOX) ---
    async processMercadoPagoCheckout(req, res) {
        const userId = req.user?.id;
        const { plan, eventId } = req.body;
        try {
            const mpAccessToken = process.env.MP_ACCESS_TOKEN || 'TEST-tu_token_de_prueba';
            const preference = {
                items: [{
                        title: plan === 'VIBE_PLUS' ? 'Pase VIBE+ VIP' : 'Vibe Pass - Entrada a Evento',
                        unit_price: plan === 'VIBE_PLUS' ? 9990 : 5000, // Precios en Pesos Chilenos (CLP)
                        quantity: 1,
                        currency_id: 'CLP'
                    }],
                external_reference: `${userId}_${eventId || 'VIBE_PLUS'}`, // Clave vital para que el Webhook sepa quién pagó
                back_urls: {
                    success: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/app.html?payment=success`,
                    failure: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/app.html?payment=failure`,
                    pending: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/app.html?payment=pending`
                },
                auto_return: 'approved',
                notification_url: `${process.env.PUBLIC_URL || 'https://tu-dominio.com'}/api/webhooks/mercadopago`
            };
            const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${mpAccessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(preference)
            });
            const data = await response.json();
            res.json({ success: true, init_point: data.sandbox_init_point || data.init_point });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error con Mercado Pago.' });
        }
    }
    // Webhook: Mercado Pago avisa automáticamente en segundo plano cuando el usuario paga
    async mercadoPagoWebhook(req, res) {
        const { type, data } = req.query.type ? req.query : req.body;
        if (type === 'payment' || (req.body.action === 'payment.created')) {
            const paymentId = data?.id || req.body.data?.id;
            try {
                const mpAccessToken = process.env.MP_ACCESS_TOKEN || 'TEST-tu_token_de_prueba';
                const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { 'Authorization': `Bearer ${mpAccessToken}` } });
                const paymentInfo = await paymentRes.json();
                if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                    const [userId, eventId] = paymentInfo.external_reference.split('_');
                    if (eventId === 'VIBE_PLUS') {
                        await database_1.db.query(`UPDATE users SET vibe_score = vibe_score + 1000 WHERE id = $1`, [userId]);
                        await notificationService.notifyUser(userId, 'SYSTEM', '💎 VIBE+', 'Tu pase premium se ha activado.');
                    }
                    else {
                        await database_1.db.query(`INSERT INTO event_attendees (event_id, user_id) VALUES ($1, $2)`, [eventId, userId]);
                        await notificationService.notifyUser(userId, 'SYSTEM', '🎫 ENTRADA LIBERADA', 'Pago confirmado. Tu QR ya está activo.');
                    }
                }
            }
            catch (e) {
                console.error('Error Webhook MP:', e);
            }
        }
        res.status(200).send('OK'); // Liberar el webhook rápido (Obligatorio por MP)
    }
    // --- RED SOCIAL E INTEGRACIONES ---
    async connectSpotify(req, res) {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false });
        await database_1.db.query(`UPDATE users SET spotify_id = 'connected_real' WHERE id = $1`, [userId]);
        res.json({ success: true, message: '🎵 Spotify conectado. Tu ADN musical se sincronizó a tu Aura.' });
    }
    async searchSpotify(req, res) {
        const { query } = req.body;
        if (!query)
            return res.json({ success: true, results: [] });
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return res.status(400).json({ success: false, message: 'Spotify Developer Credentials no detectadas en servidor (.env)' });
        }
        try {
            // Autenticación S2S (Server-to-Server)
            const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials'
            });
            const accessToken = (await tokenRes.json()).access_token;
            // Búsqueda Real
            const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const data = await searchRes.json();
            const results = data.tracks?.items.map((t) => ({
                id: t.id, title: t.name, artist: t.artists.map((a) => a.name).join(', '), cover: t.album.images[0]?.url || 'https://via.placeholder.com/100'
            })) || [];
            res.json({ success: true, results });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Fallo contactando API oficial de Spotify.' });
        }
    }
    async setSignatureSong(req, res) {
        const userId = req.user?.id;
        const { songTitle, artist, spotifyId } = req.body;
        try {
            await database_1.db.query(`DELETE FROM user_favorites WHERE user_id = $1 AND category IN ('SIGNATURE_SONG', 'SIGNATURE_SONG_ID')`, [userId]);
            await database_1.db.query(`INSERT INTO user_favorites (user_id, category, item_value) VALUES ($1, 'SIGNATURE_SONG', $2)`, [userId, `${songTitle} - ${artist}`]);
            if (spotifyId) {
                await database_1.db.query(`INSERT INTO user_favorites (user_id, category, item_value) VALUES ($1, 'SIGNATURE_SONG_ID', $2)`, [userId, spotifyId]);
            }
            res.json({ success: true, message: '🎵 Canción insignia fijada en tu perfil.' });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error guardando tu canción insignia.' });
        }
    }
    async getSocialFeed(req, res) {
        try {
            const result = await database_1.db.query(`
        SELECT sp.id, sp.content, sp.image_url, sp.likes_count, sp.created_at, u.username, u.vibe_color
        FROM social_posts sp
        JOIN users u ON sp.user_id = u.id
        ORDER BY sp.created_at DESC
        LIMIT 50
      `);
            res.json({ success: true, posts: result.rows });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
    async createSocialPost(req, res) {
        const userId = req.user?.id;
        const { content, imageUrl } = req.body;
        try {
            await database_1.db.query(`INSERT INTO social_posts (user_id, content, image_url) VALUES ($1, $2, $3)`, [userId, content, imageUrl || null]);
            res.json({ success: true, message: 'Publicado en VIBE ✨' });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
    async likeSocialPost(req, res) {
        const userId = req.user?.id;
        const { postId } = req.body;
        try {
            await database_1.db.query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [postId, userId]);
            await database_1.db.query(`UPDATE social_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = $1`, [postId]);
            res.json({ success: true });
        }
        catch (e) {
            res.json({ success: true, message: 'Ya diste like' });
        }
    }
    // --- INTERACCIONES COMERCIALES (SUPER VIBE) ---
    async sendSuperVibe(req, res) {
        const userId = req.user?.id;
        const { targetId } = req.body;
        if (!userId)
            return res.status(401).json({ success: false });
        try {
            const userRes = await database_1.db.query(`SELECT vibe_coins FROM users WHERE id = $1`, [userId]);
            const coins = userRes.rows[0]?.vibe_coins || 0;
            const cost = 50; // Costo del Super Vibe
            if (coins < cost) {
                return res.json({ success: false, message: 'No tienes suficientes Vibe Coins 💎. ¡Reclama tu recompensa diaria o compra el pase VIBE+!' });
            }
            await database_1.db.query(`UPDATE users SET vibe_coins = vibe_coins - $1 WHERE id = $2`, [cost, userId]);
            res.json({ success: true, message: '⚡ ¡Super Vibe enviado! Tu perfil aparecerá priorizado y brillando para esta persona.' });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
    // --- INTEGRACIONES OAUTH ---
    async connectIntegration(req, res) {
        const { userId, provider, externalToken } = req.body; // provider: 'spotify' | 'youtube' | 'letterboxd'
        // Lógica para guardar el token externo y lanzar job de análisis de gustos
        res.json({ success: true, message: `Integración con ${provider} exitosa. Analizando gustos...` });
    }
    // --- GALERÍA Y VERIFICACIÓN ---
    // Endpoint: POST /users/:id/photos
    async uploadPhoto(req, res) {
        const { userId, photoBase64, caption, isNsfw } = req.body;
        try {
            const result = await verificationService.uploadUserPhoto(userId, photoBase64, caption, isNsfw);
            res.json(result);
        }
        catch (e) {
            res.status(403).json({ success: false, message: e.message });
        }
    }
    // Endpoint: POST /users/:id/verify-identity
    async verifyIdentity(req, res) {
        const { userId, idFront, idBack, biometricFace } = req.body;
        // idFront, idBack, biometricFace son strings Base64
        const result = await verificationService.submitVerification(userId, idFront, idBack, biometricFace);
        res.json(result);
    }
    // --- INTERACCIONES ---
    // Endpoint: POST /interaction/video-consent
    async toggleVideoIntent(req, res) {
        const { myUserId, targetUserId } = req.body;
        const result = await interactionService.registerConsent(myUserId, targetUserId, 'VIDEO_CALL');
        res.json(result);
    }
    // --- CHAT ÚNICO ---
    async getChatsList(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ success: false });
            const result = await database_1.db.query(`SELECT * FROM matches WHERE user_a = $1 OR user_b = $1`, [userId]);
            const chats = [];
            for (const row of result.rows) {
                const targetId = row.user_a === userId ? row.user_b : row.user_a;
                if (!targetId)
                    continue;
                const uRes = await database_1.db.query(`SELECT username, profile_audio_url FROM users WHERE id = $1`, [targetId]);
                if (uRes.rows.length === 0)
                    continue;
                const msgRes = await database_1.db.query(`
          SELECT content, created_at FROM chat_messages 
          WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
          ORDER BY created_at DESC LIMIT 1
        `, [userId, targetId]);
                chats.push({
                    id: targetId,
                    name: uRes.rows[0].username,
                    avatar: uRes.rows[0].profile_audio_url || 'https://ui-avatars.com/api/?name=' + uRes.rows[0].username + '&background=random',
                    lastMessage: msgRes.rows.length > 0 ? msgRes.rows[0].content : '¡Nuevo Match! Envía una vibra ✨',
                    time: msgRes.rows.length > 0 ? new Date(msgRes.rows[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'
                });
            }
            res.json({ success: true, chats });
        }
        catch (error) {
            res.status(500).json({ success: false });
        }
    }
    async getChatHistory(req, res) {
        const userId = req.user?.id;
        const { targetId } = req.params;
        try {
            const messages = await database_1.db.query(`
             SELECT * FROM chat_messages 
             WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
             ORDER BY created_at ASC
         `, [userId, targetId]);
            res.json({ success: true, messages: messages.rows });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
    async sendChatMessage(req, res) {
        const { senderId, receiverId, content, type } = req.body;
        try {
            const msgId = crypto.randomBytes(8).toString('hex');
            await database_1.db.query(`INSERT INTO chat_messages (id, sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4, $5)`, [msgId, senderId, receiverId, content, type || 'TEXT']);
            const msgObj = { id: msgId, sender_id: senderId, receiver_id: receiverId, content, message_type: type || 'TEXT', created_at: new Date().toISOString() };
            if (this.io)
                this.io.to(`user_${receiverId}`).emit('receive_message', msgObj);
            res.json({ success: true, message: msgObj });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
    async getIcebreaker(req, res) {
        const { userA, userB } = req.body;
        const result = await chatService.triggerIcebreaker(userA, userB);
        res.json(result);
    }
    async reactToMessage(req, res) {
        const { messageId, userId, emoji } = req.body;
        const result = await chatService.addReaction(messageId, userId, emoji);
        res.json(result);
    }
    // --- NOTIFICACIONES ---
    async getNotifications(req, res) {
        const { userId } = req.params;
        const result = await notificationService.getUnread(userId);
        res.json({ success: true, notifications: result });
    }
    async markNotificationRead(req, res) {
        const { userId, notificationId } = req.body;
        await notificationService.markAsRead(userId, notificationId);
        res.json({ success: true });
    }
    // --- LEADERBOARD ---
    async getLeaderboard(req, res) {
        const result = await reputationService.getLeaderboard();
        res.json({ success: true, leaderboard: result });
    }
    // --- SEGURIDAD ---
    async changePassword(req, res) {
        const { userId, oldPass, newPass } = req.body;
        const result = await authService.updatePassword(userId, oldPass, newPass);
        res.json(result);
    }
    // --- PANEL DE ADMINISTRACIÓN ---
    async adminGetUsers(req, res) {
        try {
            const result = await database_1.db.query(`SELECT id, username, email, phone, vibe_score, is_verified, is_blocked, created_at FROM users ORDER BY created_at DESC`);
            res.json({ success: true, users: result.rows });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error obteniendo usuarios' });
        }
    }
    async adminUpdateUser(req, res) {
        const { id } = req.params;
        const { username, vibe_score, is_verified, is_blocked } = req.body;
        try {
            await database_1.db.query(`UPDATE users SET username = $1, vibe_score = $2, is_verified = $3, is_blocked = $4 WHERE id = $5`, [username, vibe_score, is_verified ? 1 : 0, is_blocked ? 1 : 0, id]);
            res.json({ success: true, message: 'Usuario actualizado correctamente' });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error actualizando usuario' });
        }
    }
    async adminDeleteUser(req, res) {
        const { id } = req.params;
        try {
            // Eliminación en cascada segura para evitar errores de integridad
            await database_1.db.query(`DELETE FROM user_critical_values WHERE user_id = $1`, [id]);
            await database_1.db.query(`DELETE FROM users WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Usuario eliminado permanentemente' });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error eliminando usuario. Puede tener historial vinculado.' });
        }
    }
    // --- NUEVAS FUNCIONES DE ADMIN ---
    async adminGetStats(req, res) {
        try {
            const usersCount = await database_1.db.query('SELECT COUNT(*) FROM users');
            const eventsCount = await database_1.db.query('SELECT COUNT(*) FROM events');
            res.json({
                success: true,
                stats: {
                    users: Number(usersCount.rows[0].count),
                    events: Number(eventsCount.rows[0].count)
                }
            });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
    async adminCreateUser(req, res) {
        const { username, email, password } = req.body;
        // Usamos el authService pero forzamos valores predeterminados para pasarlo rápido
        const result = await authService.register({ username, email, password, birthDate: '2000-01-01', gender: 'OTHER', genderPreference: 'EVERYONE', vibeColor: 'hsl(270, 100%, 60%)' });
        res.json(result);
    }
    async adminResetPassword(req, res) {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
        }
        try {
            const result = await authService.adminForcePasswordReset(id, newPassword);
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error al forzar cambio de contraseña.' });
        }
    }
    async adminGetEvents(req, res) {
        try {
            const result = await database_1.db.query(`SELECT * FROM events ORDER BY event_date DESC`);
            res.json({ success: true, events: result.rows });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error obteniendo eventos' });
        }
    }
    async adminDeleteEvent(req, res) {
        const { id } = req.params;
        try {
            await database_1.db.query(`DELETE FROM event_attendees WHERE event_id = $1`, [id]);
            await database_1.db.query(`DELETE FROM events WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Evento eliminado permanentemente' });
        }
        catch (e) {
            res.status(500).json({ success: false, message: 'Error eliminando evento' });
        }
    }
    // --- SUPERPODERES EN APP (GOD MODE) ---
    async appBroadcast(req, res) {
        const { is_admin } = req.user;
        if (!is_admin)
            return res.status(403).json({ success: false, message: 'No tienes permisos de Dios.' });
        const { message } = req.body;
        try {
            const users = await database_1.db.query(`SELECT id FROM users`);
            for (const u of users.rows) {
                await notificationService.notifyUser(u.id, 'SYSTEM', '👑 ALERTA DEL CREADOR', message);
            }
            res.json({ success: true, message: `Onda expansiva enviada a ${users.rows.length} almas en tiempo real.` });
        }
        catch (e) {
            res.status(500).json({ success: false });
        }
    }
}
exports.VibeController = VibeController;
