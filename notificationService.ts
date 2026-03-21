import { db } from './database';
import * as crypto from 'crypto';

export class NotificationService {
  // En producción, aquí inyectaríamos la instancia de Socket.io
  // private io: Server; 


  /**
   * Envía una notificación en tiempo real y la guarda en el historial.
   */
  async notifyUser(userId: string, type: 'BADGE_EARNED' | 'NEW_MESSAGE' | 'EVENT_UPDATE' | 'SYSTEM', title: string, message: string, payload: any = {}) {
    // 1. Persistencia en Base de Datos
    const result = await db.query(
      `INSERT INTO notifications (id, user_id, type, title, message, payload) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [crypto.randomUUID(), userId, type, title, message, JSON.stringify(payload)]
    );

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

  private emitSocketEvent(userId: string, event: string, data: any) {
    // Lógica real de socket: this.io.to(userId).emit(event, data);
    console.log(`📡 [WS] Enviando a : `, data);
  }

  async markAsRead(userId: string, notificationId: string) {
    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }

  async getUnread(userId: string) {
    const res = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 AND is_read = 0 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  async clearAll(userId: string) {
    await db.query(`UPDATE notifications SET is_read = 1 WHERE user_id = $1`, [userId]);
  }
}
