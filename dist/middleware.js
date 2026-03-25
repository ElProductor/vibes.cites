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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const database_1 = require("./database");
const crypto = __importStar(require("crypto"));
// Middleware de Seguridad para validar Tokens JWT
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado.' });
    }
    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ success: false, message: 'Formato de token inválido.' });
    }
    try {
        // Implementación real de validación de Token firmado con HMAC (Estructura JWT-like)
        const parts = token.split('.');
        if (parts.length !== 2) {
            return res.status(401).json({ success: false, message: 'Formato de token inválido o alterado' });
        }
        const [payloadB64, signature] = parts;
        const secret = process.env.JWT_SECRET || 'vibe_fallback_secret_key_12345';
        const expectedSignature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
        if (signature !== expectedSignature) {
            return res.status(401).json({ success: false, message: 'Firma de token inválida. Posible intento de falsificación.' });
        }
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
        const userId = payload.id;
        const issued = payload.iat;
        if (Number.isNaN(issued))
            throw new Error('Timestamp inválido en token');
        // Expiración de token: 24h
        const MAX_AGE_MS = 24 * 60 * 60 * 1000;
        if (Date.now() - issued > MAX_AGE_MS) {
            return res.status(401).json({ success: false, message: 'Token expirado. Vuelve a iniciar sesión.' });
        }
        // Validación extra: Verificar si el usuario existe en base de datos
        const userCheck = await database_1.db.query('SELECT id, is_admin FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }
        // Inyectar usuario en la request para que los controladores lo usen
        req.user = { id: userId, is_admin: !!userCheck.rows[0].is_admin };
        next();
    }
    catch (error) {
        // Retornar 403 silencioso sin saturar la terminal del servidor
        return res.status(403).json({ success: false, message: 'Token inválido o expirado.' });
    }
};
exports.authMiddleware = authMiddleware;
