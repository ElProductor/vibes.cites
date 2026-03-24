"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReputationService = void 0;
const database_1 = require("./database");
class ReputationService {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    /**
     * Calcula y actualiza el Vibe Score basado en acciones reales.
     */
    async processBehavior(userId, action) {
        let scoreChange = 0;
        switch (action) {
            case 'ATTENDED':
                scoreChange = 5; // Recompensa por cumplir
                break;
            case 'GOOD_VIBE_BADGE':
                scoreChange = 10; // Recompensa extra si alguien te da un badge
                break;
            case 'LATE':
                scoreChange = -5; // Penalización leve
                break;
            case 'NO_SHOW':
                scoreChange = -20; // Penalización grave (arruina el evento a otros)
                break;
            case 'REPORTED':
                scoreChange = -50; // Penalización crítica
                break;
        }
        // Transacción para asegurar integridad
        try {
            // SQLite maneja transacciones diferente, simplificamos para el ejemplo usando db directo
            // 1. Registrar en Log
            await database_1.db.query(`INSERT INTO vibe_score_log (user_id, change_amount, reason) VALUES ($1, $2, $3)`, [userId, scoreChange, action]);
            // 2. Actualizar Usuario (con límite mínimo de 0 y máximo de 1000)
            await database_1.db.query(`UPDATE users SET vibe_score = MAX(0, MIN(1000, vibe_score + $1)) WHERE id = $2`, [scoreChange, userId]);
            // 3. Verificar y Desbloquear Insignias (Badges) automáticamente
            await this.checkAndUnlockBadges(database_1.db, userId);
            // await db.query('COMMIT');
        }
        catch (e) {
            // await db.query('ROLLBACK');
            throw e;
        }
    }
    // Nueva función para gestionar insignias automáticamente
    async checkAndUnlockBadges(client, userId) {
        // Obtener datos actuales del usuario (Score y Eventos asistidos)
        const userRes = await client.query(`SELECT u.vibe_score, COUNT(ea.event_id) as event_count 
       FROM users u 
       LEFT JOIN event_attendees ea ON u.id = ea.user_id AND ea.status = 'CONFIRMED'
       WHERE u.id = $1
       GROUP BY u.id`, [userId]);
        if (userRes.rows.length === 0)
            return;
        const { vibe_score, event_count } = userRes.rows[0];
        // Buscar insignias que cumplan los criterios y que el usuario NO tenga aún
        const newBadges = await client.query(`SELECT id, name, icon_url FROM badges WHERE id IN (
         SELECT id FROM badges b
         WHERE (b.required_score <= $1 AND b.required_score > 0)
         OR (b.required_events <= $2 AND b.required_events > 0)
         EXCEPT
         SELECT badge_id FROM user_badges WHERE user_id = $3
       )`, [vibe_score, event_count, userId]);
        // Otorgar insignias
        for (const badge of newBadges.rows) {
            await client.query(`INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)`, [userId, badge.id]);
            // Notificación en Tiempo Real
            await this.notificationService.notifyUser(userId, 'BADGE_EARNED', '¡Nueva Insignia Desbloqueada!', `Has ganado la insignia: ${badge.name}`, { badgeId: badge.id, icon: badge.icon_url });
        }
    }
    // --- NUEVAS FUNCIONES ---
    async getLeaderboard(limit = 10) {
        const res = await database_1.db.query(`SELECT id, username, vibe_score FROM users 
       ORDER BY vibe_score DESC LIMIT $1`, [limit]);
        return res.rows;
    }
    async getUserRank(userId) {
        // Lógica compleja de ranking percentil
        const res = await database_1.db.query(`SELECT COUNT(*) + 1 as rank FROM users WHERE vibe_score > (SELECT vibe_score FROM users WHERE id = $1)`, [userId]);
        return res.rows[0].rank;
    }
}
exports.ReputationService = ReputationService;
