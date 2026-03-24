import * as crypto from 'crypto';

export class VibePassService {
  
  /**
   * Genera el token de acceso para el QR.
   * Combina el Usuario, Evento, Marca de Tiempo y firma todo para evitar falsificaciones.
   */
  static generateSecureQRPayload(userId: string, eventId: string): string {
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
  static validateVibePass(qrBase64: string, eventId: string, maxAgeMs: number = 1000 * 60 * 5): boolean {
    try {
      const decoded = Buffer.from(qrBase64, 'base64').toString('utf8');
      const [payload, signature] = decoded.split('|');
      const [tokenUserId, tokenEventId, timestampStr] = payload.split(':');
      
      if (tokenEventId !== eventId) return false; // Entrada para otro evento
      if (Date.now() - parseInt(timestampStr, 10) > maxAgeMs) return false; // Pantallazo viejo (QR Caducado)
      
      const secretKey = process.env.VIBE_PASS_SECRET || 'llave_secreta_anti_fraudes_pelluco';
      const expectedSignature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
        
      return signature === expectedSignature; // ¿La firma coincide exactamente?
    } catch (error) {
      return false; // Cualquier manipulación falla estructuralmente aquí
    }
  }
}