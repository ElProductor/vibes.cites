import { db } from './database';
import { NotificationService } from './notificationService';
import * as crypto from 'crypto';

export class ChatService {
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  async sendMessage(senderId: string, receiverId: string, content: string, type: 'TEXT' | 'AUDIO' = 'TEXT') {
    // Aquí podríamos validar si tienen permiso para hablar (ej. Match o Evento compartido)
    await db.query(
      `INSERT INTO chat_messages (id, sender_id, receiver_id, content, message_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), senderId, receiverId, content, type]
    );

    // Notificación en Tiempo Real
    await this.notificationService.notifyUser(
      receiverId, 
      'NEW_MESSAGE', 
      'Nuevo Mensaje', 
      type === 'AUDIO' ? 'Te envió una nota de voz' : content.substring(0, 30) + '...',
      { senderId, type }
    );

    return { success: true };
  }

  async getHistory(userA: string, userB: string) {
    const result = await db.query(
      `SELECT * FROM chat_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userA, userB]
    );
    return result.rows;
  }

  // Función Única: Inyección de Rompehielos
  // Si la conversación se estanca, el sistema sugiere una pregunta.
  async triggerIcebreaker(userA: string, userB: string) {
    const promptRes = await db.query(`SELECT question_text FROM conversation_prompts ORDER BY RANDOM() LIMIT 1`);
    
    if (promptRes.rows.length > 0) {
      const question = promptRes.rows[0].question_text;
      // Se envía como un mensaje del sistema o "prompt"
      return { success: true, prompt: question };
    }
    return { success: false };
  }

  // Función Única: Reaccionar a mensajes
  async addReaction(messageId: string, userId: string, emoji: string) {
    await db.query(
      `INSERT INTO message_reactions (message_id, user_id, reaction_emoji) VALUES ($1, $2, $3)`,
      [messageId, userId, emoji]
    );
    return { success: true };
  }

  // --- NUEVAS FUNCIONES ---

  async markMessagesAsRead(senderId: string, receiverId: string) {
    await db.query(
      `UPDATE chat_messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2`,
      [senderId, receiverId]
    );
  }

  async deleteMessage(messageId: string, userId: string) {
    // Soft delete: solo ocultamos el contenido
    await db.query(
      `UPDATE chat_messages SET content = 'Mensaje eliminado', message_type = 'DELETED' 
       WHERE id = $1 AND sender_id = $2`,
      [messageId, userId]
    );
  }
}