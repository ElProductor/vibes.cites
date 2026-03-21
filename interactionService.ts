// services/InteractionService.ts

import { db } from './database';

export class InteractionService {

  /**
   * El usuario A indica que está abierto a una interacción (Video, Teléfono, Cita)
   */
  async registerConsent(actorId: string, targetId: string, type: 'VIDEO_CALL' | 'ONE_ON_ONE_DATE') {
    // 1. Guardar la intención del usuario A
    // Usamos ON CONFLICT DO NOTHING para evitar duplicados
    await db.query(
      `INSERT INTO interaction_consent (actor_user_id, target_user_id, consent_type)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [actorId, targetId, type]
    );

    // 2. Verificar si hay "Match de Consentimiento" (El otro ya dio el sí antes)
    const matchCheck = await db.query(
      `SELECT * FROM interaction_consent 
       WHERE actor_user_id = $1 AND target_user_id = $2 AND consent_type = $3`,
      [targetId, actorId, type] // Nota: invertimos actor y target para buscar al otro
    );

    if (matchCheck.rows.length > 0) {
      return this.unlockFeature(actorId, targetId, type);
    }

    return { status: 'PENDING', message: 'Intención registrada. Si es mutuo, se activará.' };
  }

  /**
   * Se ejecuta solo cuando AMBOS dijeron que sí.
   */
  private unlockFeature(user1: string, user2: string, type: string) {
    console.log(`🚀 UNLOCKING ${type} for users ${user1} and ${user2}`);
    
    if (type === 'VIDEO_CALL') {
      // Aquí generaríamos el token de WebRTC (Twilio, Agora, etc.)
      return { 
        status: 'MATCHED', 
        action: 'START_VIDEO', 
        roomId: `room_${user1}_${user2}_${Date.now()}` 
      };
    }
    
    if (type === 'ONE_ON_ONE_DATE') {
      return {
        status: 'MATCHED',
        action: 'SUGGEST_LOCATIONS',
        message: '¡Ambos quieren una cita individual! Aquí hay 3 cafés tranquilos cerca.'
      };
    }
  }

  async blockUser(blockerId: string, blockedId: string, reason: string) {
    await db.query(
      `INSERT INTO blocked_users (blocker_id, blocked_id, reason) VALUES ($1, $2, $3)`,
      [blockerId, blockedId, reason]
    );
    return { success: true, message: 'Usuario bloqueado. No volverán a coincidir en eventos.' };
  }
}
