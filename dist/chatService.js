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
exports.ChatService = void 0;
const database_1 = require("./database");
const crypto = __importStar(require("crypto"));
class ChatService {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async sendMessage(senderId, receiverId, content, type = 'TEXT') {
        // Aquí podríamos validar si tienen permiso para hablar (ej. Match o Evento compartido)
        await database_1.db.query(`INSERT INTO chat_messages (id, sender_id, receiver_id, content, message_type)
       VALUES ($1, $2, $3, $4, $5)`, [crypto.randomUUID(), senderId, receiverId, content, type]);
        // Notificación en Tiempo Real
        await this.notificationService.notifyUser(receiverId, 'NEW_MESSAGE', 'Nuevo Mensaje', type === 'AUDIO' ? 'Te envió una nota de voz' : content.substring(0, 30) + '...', { senderId, type });
        return { success: true };
    }
    async getHistory(userA, userB) {
        const result = await database_1.db.query(`SELECT * FROM chat_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`, [userA, userB]);
        return result.rows;
    }
    // Función Única: Inyección de Rompehielos
    // Si la conversación se estanca, el sistema sugiere una pregunta.
    async triggerIcebreaker(userA, userB) {
        const promptRes = await database_1.db.query(`SELECT question_text FROM conversation_prompts ORDER BY RANDOM() LIMIT 1`);
        if (promptRes.rows.length > 0) {
            const question = promptRes.rows[0].question_text;
            // Se envía como un mensaje del sistema o "prompt"
            return { success: true, prompt: question };
        }
        return { success: false };
    }
    // Función Única: Reaccionar a mensajes
    async addReaction(messageId, userId, emoji) {
        await database_1.db.query(`INSERT INTO message_reactions (message_id, user_id, reaction_emoji) VALUES ($1, $2, $3)`, [messageId, userId, emoji]);
        return { success: true };
    }
    // --- NUEVAS FUNCIONES ---
    async markMessagesAsRead(senderId, receiverId) {
        await database_1.db.query(`UPDATE chat_messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2`, [senderId, receiverId]);
    }
    async deleteMessage(messageId, userId) {
        // Soft delete: solo ocultamos el contenido
        await database_1.db.query(`UPDATE chat_messages SET content = 'Mensaje eliminado', message_type = 'DELETED' 
       WHERE id = $1 AND sender_id = $2`, [messageId, userId]);
    }
}
exports.ChatService = ChatService;
