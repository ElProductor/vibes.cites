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
exports.VibePassService = void 0;
const crypto = __importStar(require("crypto"));
class VibePassService {
    /**
     * Genera el token de acceso para el QR.
     * Combina el Usuario, Evento, Marca de Tiempo y firma todo para evitar falsificaciones.
     */
    static generateSecureQRPayload(userId, eventId) {
        const timestamp = Date.now();
        // Llave secreta del servidor (Solo el servidor y los validadores la conocen)
        const secretKey = process.env.VIBE_PASS_SECRET || 'llave_secreta_anti_fraudes_pelluco';
        // Payload base: idUsuario:idEvento:tiempo
        const payload = `${userId}:${eventId}:${timestamp}`;
        // Firma HMAC SHA-256 (Garantiza que nadie alteró el ID o la fecha)
        const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
        // Devolvemos la estructura codificada en Base64 para inyectarla directo al QR
        return Buffer.from(`${payload}|${signature}`).toString('base64');
    }
    /**
     * Valida el código QR en la puerta del evento (Escáner del Guardia).
     * maxAgeMs: Define cuánto tiempo dura "vivo" el QR antes de requerir recarga (ej. 5 minutos).
     */
    static validateVibePass(qrBase64, eventId, maxAgeMs = 1000 * 60 * 5) {
        try {
            const decoded = Buffer.from(qrBase64, 'base64').toString('utf8');
            const [payload, signature] = decoded.split('|');
            const [tokenUserId, tokenEventId, timestampStr] = payload.split(':');
            if (tokenEventId !== eventId)
                return false; // Entrada para otro evento
            if (Date.now() - parseInt(timestampStr, 10) > maxAgeMs)
                return false; // Pantallazo viejo (QR Caducado)
            const secretKey = process.env.VIBE_PASS_SECRET || 'llave_secreta_anti_fraudes_pelluco';
            const expectedSignature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
            return signature === expectedSignature; // ¿La firma coincide exactamente?
        }
        catch (error) {
            return false; // Cualquier manipulación falla estructuralmente aquí
        }
    }
}
exports.VibePassService = VibePassService;
