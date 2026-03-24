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
exports.NotificationService = void 0;
const database_1 = require("./database");
const crypto = __importStar(require("crypto"));
class NotificationService {
    // En producción, aquí inyectaríamos la instancia de Socket.io
    // private io: Server; 
    /**
     * Envía una notificación en tiempo real y la guarda en el historial.
     */
    async notifyUser(userId, type, title, message, payload = {}) {
        // 1. Persistencia en Base de Datos
        const result = await database_1.db.query(`INSERT INTO notifications (id, user_id, type, title, message, payload) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`, [crypto.randomUUID(), userId, type, title, message, JSON.stringify(payload)]);
        const notification = result.rows[0];
        // 2. Emisión WebSocket (Simulación)
        this.emitSocketEvent(userId, 'NOTIFICATION', {
            id: notification.id,
            type,
            title,
            message,
            payload,
            createdAt: notification.created_at
        });
        return notification;
    }
    emitSocketEvent(userId, event, data) {
        // Lógica real de socket: this.io.to(userId).emit(event, data);
        console.log(`📡 [WS] Enviando a : `, data);
    }
    async markAsRead(userId, notificationId) {
        await database_1.db.query(`UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2`, [notificationId, userId]);
    }
    async getUnread(userId) {
        const res = await database_1.db.query(`SELECT * FROM notifications WHERE user_id = $1 AND is_read = 0 ORDER BY created_at DESC`, [userId]);
        return res.rows;
    }
    async clearAll(userId) {
        await database_1.db.query(`UPDATE notifications SET is_read = 1 WHERE user_id = $1`, [userId]);
    }
}
exports.NotificationService = NotificationService;
