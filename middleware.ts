import { db } from './database';

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
    // En un entorno real: jwt.verify(token, process.env.JWT_SECRET)
    // Aquí simulamos la validación decodificando nuestro "mock-signed-token"
    // Formato simulado: "valid_token_userId_timestamp_random"
    
    if (!token.startsWith('valid_token_')) {
        throw new Error('Token inválido');
    }

    const parts = token.split('_');
    if(parts.length < 4) throw new Error('Formato de token inválido');

    const userId = parts[2];
    const issued = parseInt(parts[3], 10);
    if (Number.isNaN(issued)) throw new Error('Timestamp inválido en token');

    // Expiración de token: 24h
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - issued > MAX_AGE_MS) {
        return res.status(401).json({ success: false, message: 'Token expirado. Vuelve a iniciar sesión.' });
    }

    // Validación extra: Verificar si el usuario existe y no está bloqueado
    const userCheck = await db.query('SELECT id, is_blocked FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
        throw new Error('Usuario no encontrado');
    }

    if (userCheck.rows[0].is_blocked) {
        return res.status(403).json({ success: false, message: 'Usuario bloqueado.' });
    }

    // Inyectar usuario en la request para que los controladores lo usen
    req.user = { id: userId };
    next();
  } catch (error) {
    console.error('authMiddleware error:', error);
    return res.status(403).json({ success: false, message: 'Token inválido o expirado.' });
  }
};