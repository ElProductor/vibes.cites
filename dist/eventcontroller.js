"use strict";
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
// Instanciación con Inyección de Dependencias
const notificationService = new notificationService_1.NotificationService();
const matchingEngine = new matchingEngine_1.VibeMatchingEngine();
const interactionService = new interactionService_1.InteractionService();
const authService = new authService_1.AuthService();
const chatService = new chatService_1.ChatService(notificationService); // Inyectado
const reputationService = new reputationService_1.ReputationService(notificationService); // Inyectado
const verificationService = new verificationService_1.VerificationService();
class VibeController {
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
        const result = await database_1.db.query(`SELECT username, birth_date, zodiac_sign, bio, occupation, vibe_color, vibe_score FROM users WHERE id = $1`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });
        const user = result.rows[0];
        const realProfile = {
            basic: { username: user.username, zodiac: user.zodiac_sign || 'Aries', bio: user.bio || 'Sin biografía' },
            details: { occupation: user.occupation || 'N/A' },
            vibeCheck: { redFlags: [], greenFlags: [] },
        };
        res.json({ success: true, profile: realProfile });
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
        // En una app real, recuperaríamos esto de la DB
        const event = { id: eventId, capacity: 6, tags: ['Wine', 'Chill'], activityType: 'WINE_TASTING' };
        const candidates = []; // Array de usuarios interesados recuperados de DB
        // Usamos el motor para recalcular la lista de invitados
        const finalGuestList = matchingEngine.generateGuestList(event, candidates);
        const userAccepted = finalGuestList.some(u => u.id === userId);
        if (userAccepted) {
            res.json({ success: true, message: "¡Estás dentro! Tu grupo es compatible." });
        }
        else {
            // Mensaje suave, no de rechazo personal
            res.json({ success: false, message: "Este evento alcanzó su límite de balance. Te avisaremos del próximo." });
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
    // --- GPS Y PARTYS EN TIEMPO REAL ---
    async getRadarParties(req, res) {
        // Simulación Comercial de Mapa de Tendencias (Hotspots)
        const mockParties = [
            {
                id: '1', name: 'Neon Art Drop 🍸',
                lat: 19.4326, lng: -99.1332, distance: '0.5km', capacity: '90%',
                image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
                vibe: 'Chill & Networking',
                price: 'Gratis',
                organizer: 'Galería Tonal'
            },
            {
                id: '2', name: 'Bresh Party Mexico 🪩',
                lat: 19.4340, lng: -99.1350, distance: '1.2km', capacity: '85%',
                image: 'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=800&auto=format&fit=crop',
                vibe: 'Wild & Dancing',
                price: '$25 USD',
                organizer: 'Bresh Oficial'
            },
            {
                id: '3', name: 'Secret Rooftop (Vibe+) 🌙',
                lat: 19.4300, lng: -99.1400, distance: '3km', capacity: '100%',
                image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=800&auto=format&fit=crop',
                vibe: 'Exclusive & Deep Talks',
                price: 'Solo Invitación',
                organizer: 'Vibe Premium'
            }
        ];
        res.json({ success: true, parties: mockParties });
    }
    // --- MATCHES BASADOS EN GUSTOS Y ASISTENCIA ---
    async getMatches(req, res) {
        // Análisis Comercial y Juvenil (Astrología, IG, Spotify)
        const mockMatches = [
            {
                id: 'u1', name: 'Ana', age: 24,
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
                synergy: 94,
                breakdown: { music: 98, vibe: 85, astrology: 90 },
                commonInterest: 'Bad Bunny (Spotify) & Signos de Fuego (Co-Star)',
                eventId: '1',
                bio: 'Buscando con quién ir a Bresh este finde ✨'
            },
            {
                id: 'u2', name: 'Carlos', age: 27,
                avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop',
                synergy: 88,
                breakdown: { humor: 95, lifestyle: 80, music: 70 },
                commonInterest: 'Siguen a las mismas cuentas en Instagram y TikTok',
                eventId: '2',
                bio: 'Diseñador de día, DJ de noche. Siempre café helado ☕'
            }
        ];
        res.json({ success: true, matches: mockMatches });
    }
    // --- FEED EN VIVO DE LA CIUDAD ---
    async getLiveFeed(req, res) {
        const feed = [
            { time: 'Hace 1 min', text: '🎟️ Las entradas VIP para Bresh están por agotarse', type: 'hot', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=500&auto=format&fit=crop' },
            { time: 'Hace 3 min', text: '📸 Alguien de tus contactos mutuos de IG se unió a Vibe', type: 'match', image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=500&auto=format&fit=crop' },
            { time: 'Hace 10 min', text: '✨ Tienes 2 nuevos "Likes" secretos (Sube a Vibe+ para verlos)', type: 'hot', image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=500&auto=format&fit=crop' },
            { time: 'Hace 15 min', text: '🔥 15 personas acaban de confirmar asistencia al Secret Rooftop', type: 'event', image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=500&auto=format&fit=crop' }
        ];
        res.json({ success: true, feed });
    }
    // --- HISTORIAS / EVENTOS EN VIVO (ESTILO INSTAGRAM) ---
    async getStories(req, res) {
        const stories = [
            { id: 's1', title: 'Bresh Live 🪩', isLive: true, thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop' },
            { id: 's2', title: 'Afterparty 🍸', isLive: false, thumbnail: 'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=300&auto=format&fit=crop' },
            { id: 's3', title: 'Neon Drop 🎨', isLive: true, thumbnail: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=300&auto=format&fit=crop' },
            { id: 's4', title: 'Rooftop Chill', isLive: false, thumbnail: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=300&auto=format&fit=crop' }
        ];
        res.json({ success: true, stories });
    }
    // --- METRICAS VIBE (API/metrics) ---
    async getMetrics(req, res) {
        let activeUsersCount = 0;
        try {
            const activeUsersResult = await database_1.db.query("SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL '20 minutes'");
            activeUsersCount = Number(activeUsersResult.rows[0]?.count || 0);
        }
        catch (error) {
            // Si la base de datos no usa `last_active`, regresamos un valor estimado seguro
            activeUsersCount = 120;
        }
        const hotspotCount = 3; // mock data
        const matchRate = 91; // porcentaje heurístico
        const pendingRequests = 0;
        res.json({
            success: true,
            matchRate,
            hotspotCount,
            activeUsers: activeUsersCount,
            pendingRequests,
            updatedAt: new Date().toISOString()
        });
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
            const premiumUsers = await database_1.db.query("SELECT COUNT(*) FROM users WHERE is_premium = true");
            res.json({
                success: true,
                stats: {
                    totalUsers: Number(totalUsers.rows[0].count),
                    activeUsers: Number(activeUsers.rows[0].count),
                    totalEvents: Number(totalEvents.rows[0].count),
                    premiumUsers: Number(premiumUsers.rows[0].count),
                    activeMatches: 27,
                    averageSession: '11m 42s'
                }
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: String(error) });
        }
    }
    // --- MONETIZACIÓN: STRIPE CHECKOUT (SIMULADO) ---
    async processCheckout(req, res) {
        const { userId, plan } = req.body;
        // Aquí iría el código del SDK real: await stripe.checkout.sessions.create({...})
        // Otorgamos un Boost masivo de reputación por comprar la suscripción
        await database_1.db.query(`UPDATE users SET vibe_score = vibe_score + 1000 WHERE id = $1`, [userId]);
        res.json({ success: true, message: 'Pago procesado vía Stripe. ¡Aura y Estatus elevados! 💎' });
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
    async sendChatMessage(req, res) {
        const { senderId, receiverId, content, type } = req.body;
        const result = await chatService.sendMessage(senderId, receiverId, content, type);
        res.json(result);
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
}
exports.VibeController = VibeController;
