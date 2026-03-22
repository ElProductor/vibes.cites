import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import * as path from 'path'; // Importar path
import { VibeController } from './eventcontroller';
import { authMiddleware } from './middleware';
import passport from './passport'; // Importar configuración de Passport

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Servir archivos estáticos (Frontend)
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(passport.initialize()); // Inicializar Passport

const controller = new VibeController();

// --- RUTAS ---

// Ruta de inicio explícita para asegurar que cargue en la nube
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
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
    passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
        if (err) {
            console.error("❌ Error en Google Callback:", err.message);
            // Redirigir con el error para que el frontend lo muestre
            return res.redirect('/?error=google_auth_error');
        }
        if (!user) {
            return res.redirect('/?error=login_failed');
        }
        const data = user as any;
        res.redirect(`/?token=${data.token}&user=${encodeURIComponent(JSON.stringify(data.user))}`);
    })(req, res, next);
});

// 2. Facebook
app.get('/auth/facebook', (req, res, next) => {
    const state = req.query.vibe_color ? 
        Buffer.from(JSON.stringify({ vibeColor: req.query.vibe_color })).toString('base64') : undefined;
    passport.authenticate('facebook', { scope: ['email'], state })(req, res, next);
});

app.get('/auth/facebook/callback', (req, res, next) => {
    passport.authenticate('facebook', { session: false }, (err: any, user: any, info: any) => {
        if (err) {
            console.error("❌ Error en Facebook Callback:", err.message);
            return res.redirect('/?error=facebook_auth_error');
        }
        if (!user) {
            return res.redirect('/?error=login_failed');
        }
        const data = req.user as any;
        res.redirect(`/?token=${data.token}&user=${encodeURIComponent(JSON.stringify(data.user))}`);
    })(req, res, next);
});

app.post('/auth/change-password', authMiddleware, (req, res) => controller.changePassword(req, res));

// Seguridad E2EE
app.post('/auth/public-key', authMiddleware, (req, res) => controller.updatePublicKey(req, res));

// Usuarios y Perfil
app.get('/users/:id/profile', authMiddleware, (req, res) => controller.getUserProfile(req, res));
app.get('/users/:id/badges', authMiddleware, (req, res) => controller.getUserBadges(req, res));
app.post('/users/photos', authMiddleware, (req, res) => controller.uploadPhoto(req, res));
app.post('/users/verify', authMiddleware, (req, res) => controller.verifyIdentity(req, res));
app.get('/users/:userId/notifications', authMiddleware, (req, res) => controller.getNotifications(req, res));

// Eventos
app.post('/events/join', authMiddleware, (req, res) => controller.joinEvent(req, res));
app.post('/events/report', authMiddleware, (req, res) => controller.reportEventBehavior(req, res));

// Nuevas Rutas de GPS, Partys y Matches
app.get('/api/parties/radar', authMiddleware, (req, res) => controller.getRadarParties(req, res));
app.get('/api/matches', authMiddleware, (req, res) => controller.getMatches(req, res));
app.get('/api/live-feed', authMiddleware, (req, res) => controller.getLiveFeed(req, res));
app.get('/api/stories', authMiddleware, (req, res) => controller.getStories(req, res));
app.get('/api/metrics', authMiddleware, (req, res) => controller.getMetrics(req, res));
app.get('/api/health', (req, res) => controller.healthCheck(req, res));
app.get('/api/stats', authMiddleware, (req, res) => controller.getStats(req, res));
app.post('/api/checkout/premium', authMiddleware, (req, res) => controller.processCheckout(req, res));

// Integraciones
app.post('/api/integrations/connect', authMiddleware, (req, res) => controller.connectIntegration(req, res));

// Interacción y Chat
app.post('/interaction/video-consent', authMiddleware, (req, res) => controller.toggleVideoIntent(req, res));
app.post('/chat/send', authMiddleware, (req, res) => controller.sendChatMessage(req, res));
app.post('/chat/icebreaker', authMiddleware, (req, res) => controller.getIcebreaker(req, res));
app.post('/chat/react', authMiddleware, (req, res) => controller.reactToMessage(req, res));
app.post('/notifications/read', authMiddleware, (req, res) => controller.markNotificationRead(req, res));

// Leaderboard
app.get('/leaderboard', (req, res) => controller.getLeaderboard(req, res));

const server = app.listen(port, () => {
  console.log(`🚀 VIBE Server listo en: http://localhost:${port}`);
  console.log(`👉 Callback Google: http://localhost:${port}/auth/google/callback`);
  console.log(`👉 Callback Facebook: http://localhost:${port}/auth/facebook/callback`);
});

server.on('error', (error: any) => {
    console.error("❌ Error fatal al iniciar el servidor:", error);
    if (error.code === 'EADDRINUSE') {
        console.error(`   -> El puerto ${port} está ocupado. Cierra otros procesos de node.`);
    }
});