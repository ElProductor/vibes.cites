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
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const path = __importStar(require("path")); // Importar path
const fs = __importStar(require("fs")); // Importar file system para validación
const eventcontroller_1 = require("./eventcontroller");
const middleware_1 = require("./middleware");
const passport_1 = __importDefault(require("./passport")); // Importar configuración de Passport
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.set('trust proxy', 1); // Confiar en el proxy inverso de Railway
app.use(body_parser_1.default.json());
// --- BÚSQUEDA INTELIGENTE DE CARPETA PUBLIC ---
let publicPath = path.join(process.cwd(), 'public'); // Opción A: Raíz pura (Railway)
if (!fs.existsSync(publicPath)) {
    publicPath = path.join(__dirname, '../public'); // Opción B: Si arranca desde dist/
}
if (!fs.existsSync(publicPath)) {
    publicPath = path.join(__dirname, 'public'); // Opción C: Si arranca localmente
}
// Servir archivos estáticos (Frontend)
app.use(express_1.default.static(publicPath));
app.use(passport_1.default.initialize()); // Inicializar Passport
const controller = new eventcontroller_1.VibeController();
// --- RUTAS ---
// Ruta de inicio explícita para asegurar que cargue en la nube
app.get('/', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(200).send(`
                <div style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #0f0f13; color: white; padding: 50px; height: 100vh;">
                    <h1 style="color: #a855f7;">🚀 VIBE Backend Online</h1>
                    <p>El motor del servidor está funcionando perfectamente en Railway.</p>
                    <p style="color: #9ca3af;">Sin embargo, no se detectó la carpeta <b>public/</b> con tu HTML. Asegúrate de hacer git push de la carpeta.</p>
                </div>
            `);
        }
    });
});
// Autenticación
app.post('/auth/register', (req, res) => controller.register(req, res));
app.post('/auth/login', (req, res) => controller.login(req, res));
// Rutas de Teléfono / OTP
app.post('/auth/login/send-otp', (req, res) => controller.sendOtp(req, res));
app.post('/auth/login/verify', (req, res) => controller.verifyLoginOtp(req, res));
app.post('/auth/register/send-otp', (req, res) => controller.sendRegisterOtp(req, res));
// --- RUTAS DE AUTENTICACIÓN SOCIAL REAL ---
// 1. Google
app.get('/auth/google', (req, res, next) => {
    const state = req.query.vibe_color ?
        Buffer.from(JSON.stringify({ vibeColor: req.query.vibe_color })).toString('base64') : undefined;
    passport_1.default.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});
app.get('/auth/google/callback', (req, res, next) => {
    passport_1.default.authenticate('google', { session: false }, (err, user, info) => {
        if (err) {
            console.error("❌ Error en Google Callback:", err.message);
            // Redirigir con el error para que el frontend lo muestre
            return res.redirect('/?error=google_auth_error');
        }
        if (!user) {
            return res.redirect('/?error=login_failed');
        }
        const data = user;
        res.redirect(`/?token=${data.token}&user=${encodeURIComponent(JSON.stringify(data.user))}`);
    })(req, res, next);
});
// 2. Facebook
app.get('/auth/facebook', (req, res, next) => {
    const state = req.query.vibe_color ?
        Buffer.from(JSON.stringify({ vibeColor: req.query.vibe_color })).toString('base64') : undefined;
    passport_1.default.authenticate('facebook', { scope: ['email'], state })(req, res, next);
});
app.get('/auth/facebook/callback', (req, res, next) => {
    passport_1.default.authenticate('facebook', { session: false }, (err, user, info) => {
        if (err) {
            console.error("❌ Error en Facebook Callback:", err.message);
            return res.redirect('/?error=facebook_auth_error');
        }
        if (!user) {
            return res.redirect('/?error=login_failed');
        }
        const data = req.user;
        res.redirect(`/?token=${data.token}&user=${encodeURIComponent(JSON.stringify(data.user))}`);
    })(req, res, next);
});
app.post('/auth/change-password', middleware_1.authMiddleware, (req, res) => controller.changePassword(req, res));
// Seguridad E2EE
app.post('/auth/public-key', middleware_1.authMiddleware, (req, res) => controller.updatePublicKey(req, res));
// Usuarios y Perfil
app.get('/users/:id/profile', middleware_1.authMiddleware, (req, res) => controller.getUserProfile(req, res));
app.get('/users/:id/badges', middleware_1.authMiddleware, (req, res) => controller.getUserBadges(req, res));
app.post('/users/photos', middleware_1.authMiddleware, (req, res) => controller.uploadPhoto(req, res));
app.post('/users/verify', middleware_1.authMiddleware, (req, res) => controller.verifyIdentity(req, res));
app.get('/users/:userId/notifications', middleware_1.authMiddleware, (req, res) => controller.getNotifications(req, res));
// Eventos
app.post('/events/join', middleware_1.authMiddleware, (req, res) => controller.joinEvent(req, res));
app.post('/events/report', middleware_1.authMiddleware, (req, res) => controller.reportEventBehavior(req, res));
// Nuevas Rutas de GPS, Partys y Matches
app.get('/api/parties/radar', middleware_1.authMiddleware, (req, res) => controller.getRadarParties(req, res));
app.get('/api/matches', middleware_1.authMiddleware, (req, res) => controller.getMatches(req, res));
app.get('/api/live-feed', middleware_1.authMiddleware, (req, res) => controller.getLiveFeed(req, res));
app.get('/api/stories', middleware_1.authMiddleware, (req, res) => controller.getStories(req, res));
app.get('/api/metrics', middleware_1.authMiddleware, (req, res) => controller.getMetrics(req, res));
app.get('/api/health', (req, res) => controller.healthCheck(req, res));
app.get('/api/stats', middleware_1.authMiddleware, (req, res) => controller.getStats(req, res));
app.post('/api/checkout/premium', middleware_1.authMiddleware, (req, res) => controller.processCheckout(req, res));
// Integraciones
app.post('/api/integrations/connect', middleware_1.authMiddleware, (req, res) => controller.connectIntegration(req, res));
// Interacción y Chat
app.post('/interaction/video-consent', middleware_1.authMiddleware, (req, res) => controller.toggleVideoIntent(req, res));
app.post('/chat/send', middleware_1.authMiddleware, (req, res) => controller.sendChatMessage(req, res));
app.post('/chat/icebreaker', middleware_1.authMiddleware, (req, res) => controller.getIcebreaker(req, res));
app.post('/chat/react', middleware_1.authMiddleware, (req, res) => controller.reactToMessage(req, res));
app.post('/notifications/read', middleware_1.authMiddleware, (req, res) => controller.markNotificationRead(req, res));
// Leaderboard
app.get('/leaderboard', (req, res) => controller.getLeaderboard(req, res));
const server = app.listen(port, () => {
    let domain = process.env.PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN || `localhost:${port}`;
    domain = domain.replace(/^https?:\/\//, '');
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    console.log(`🚀 VIBE Server listo en: http://localhost:${port}`);
    console.log(`👉 Callback Google: ${protocol}://${domain}/auth/google/callback`);
    console.log(`👉 Callback Facebook: ${protocol}://${domain}/auth/facebook/callback`);
});
server.on('error', (error) => {
    console.error("❌ Error fatal al iniciar el servidor:", error);
    if (error.code === 'EADDRINUSE') {
        console.error(`   -> El puerto ${port} está ocupado. Cierra otros procesos de node.`);
    }
});
