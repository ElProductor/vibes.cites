import { db } from './database';
import * as crypto from 'crypto';

// Middleware de Seguridad para validar Tokens JWT
export const authMiddleware = async (req: any, res: any, next: any) => {
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
    if (Number.isNaN(issued)) throw new Error('Timestamp inválido en token');

    // Expiración de token: 24h
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - issued > MAX_AGE_MS) {
        return res.status(401).json({ success: false, message: 'Token expirado. Vuelve a iniciar sesión.' });
    }

    // Validación extra: Verificar si el usuario existe en base de datos
    const userCheck = await db.query('SELECT id, is_admin FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Inyectar usuario en la request para que los controladores lo usen
    req.user = { id: userId, is_admin: !!userCheck.rows[0].is_admin };
    next();
  } catch (error) {
    // Retornar 403 silencioso sin saturar la terminal del servidor
    return res.status(403).json({ success: false, message: 'Token inválido o expirado.' });
  }
};