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
exports.AuthService = void 0;
const database_1 = require("./database");
const crypto = __importStar(require("crypto"));
class AuthService {
    constructor() {
        // Almacén temporal de OTPs con Tiempo de Expiración (Seguridad)
        this.otpStore = new Map();
    }
    // Generación de Hash Seguro usando Scrypt (Nativo de Node) y Salt dinámico
    hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }
    // Verificador seguro de contraseñas
    verifyPassword(password, storedHash) {
        if (!storedHash || !storedHash.includes(':'))
            return false;
        const [salt, originalHash] = storedHash.split(':');
        const attemptHash = crypto.scryptSync(password, salt, 64).toString('hex');
        return originalHash === attemptHash;
    }
    // Helper para calcular signo zodiacal (simplificado)
    getZodiacSign(date) {
        if (!date || isNaN(date.getTime()))
            return 'Unknown';
        const day = date.getDate();
        const month = date.getMonth() + 1;
        if ((month == 1 && day <= 19) || (month == 12 && day >= 22))
            return 'Capricorn';
        if ((month == 1 && day >= 20) || (month == 2 && day <= 18))
            return 'Aquarius';
        if ((month == 2 && day >= 19) || (month == 3 && day <= 20))
            return 'Pisces';
        if ((month == 3 && day >= 21) || (month == 4 && day <= 19))
            return 'Aries';
        if ((month == 4 && day >= 20) || (month == 5 && day <= 20))
            return 'Taurus';
        if ((month == 5 && day >= 21) || (month == 6 && day <= 20))
            return 'Gemini';
        if ((month == 6 && day >= 21) || (month == 7 && day <= 22))
            return 'Cancer';
        if ((month == 7 && day >= 23) || (month == 8 && day <= 22))
            return 'Leo';
        if ((month == 8 && day >= 23) || (month == 9 && day <= 22))
            return 'Virgo';
        if ((month == 9 && day >= 23) || (month == 10 && day <= 22))
            return 'Libra';
        if ((month == 10 && day >= 23) || (month == 11 && day <= 21))
            return 'Scorpio';
        if ((month == 11 && day >= 22) || (month == 12 && day <= 21))
            return 'Sagittarius';
        return 'Unknown';
    }
    // Validación de Email
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    // --- GESTIÓN DE OTP (SMS) ---
    async sendOtp(phone) {
        // Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // Validez de 5 minutos
        this.otpStore.set(phone, { code, expiresAt });
        // Script enviador de SMS automático a través de API
        const message = `Tu código VIBE es: ${code}. Válido por 5 minutos.`;
        await this.sendSmsApi(phone, message);
        console.log(`📱 API SMS EJECUTADA para ${phone}: Tu código es [ ${code} ]`);
        return { success: true, message: 'Código SMS enviado a tu teléfono' };
    }
    // Motor de envío SMS profesional usando Twilio (Fetch Nativo)
    async sendSmsApi(phone, message) {
        try {
            // 1. Limpieza ESTRICTA: Elimina comillas "", saltos de línea y caracteres ocultos
            const sid = (process.env.TWILIO_ACCOUNT_SID || '').replace(/[^a-zA-Z0-9]/g, '');
            const token = (process.env.TWILIO_AUTH_TOKEN || '').replace(/[^a-zA-Z0-9]/g, '');
            const fromPhone = (process.env.TWILIO_PHONE_NUMBER || '').replace(/[^\d+]/g, '');
            // 2. Auto-formatear el número destino para asegurar el formato (+CódigoPaís)
            let toPhone = phone.replace(/[^\d+]/g, '');
            if (!toPhone.startsWith('+'))
                toPhone = '+' + toPhone.replace(/\+/g, '');
            // Si no hay credenciales, permitimos que el código se imprima en consola (Modo Pruebas)
            if (!sid || !token) {
                console.warn('⚠️ Twilio no configurado en Railway. Modo Pruebas Activado (Lee el código en consola).');
                return true;
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
            if (data.error_message)
                console.warn('⚠️ Alerta Twilio:', data.error_message);
            return !data.error_message;
        }
        catch (error) {
            console.error('❌ Error de red conectando con Twilio:', error.message || error);
            return false;
        }
    }
    async verifyOtp(phone, code) {
        const record = this.otpStore.get(phone);
        if (!record)
            return false;
        // Verificar si el código ya expiró
        if (Date.now() > record.expiresAt) {
            this.otpStore.delete(phone);
            return false;
        }
        // Si es correcto, devolvemos true (Se borra recién al finalizar el registro/login)
        return record.code === code;
    }
    async register(userData) {
        try {
            const { username, email, phone, code, password, birthDate, gender, genderPreference, bio, occupation, favorites, vibeColor } = userData;
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
            if (phone) {
                if (!code || !await this.verifyOtp(phone, code)) {
                    return { success: false, message: 'Código de verificación incorrecto' };
                }
            }
            else {
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
            const usernameCheck = await database_1.db.query(`SELECT id FROM users WHERE username = $1`, [username]);
            if (usernameCheck.rows.length > 0) {
                return { success: false, message: 'El nombre de usuario ya está en uso. Elige otro.' };
            }
            if (phone) {
                const phoneCheck = await database_1.db.query(`SELECT id FROM users WHERE phone = $1`, [phone]);
                if (phoneCheck.rows.length > 0) {
                    return { success: false, message: 'Este número de teléfono ya está registrado. Por favor, inicia sesión.' };
                }
            }
            else if (email) {
                const emailCheck = await database_1.db.query(`SELECT id FROM users WHERE email = $1`, [email]);
                if (emailCheck.rows.length > 0) {
                    return { success: false, message: 'Este correo electrónico ya está registrado. Por favor, inicia sesión.' };
                }
            }
            const passwordHash = password ? this.hashPassword(password) : null;
            const zodiac = this.getZodiacSign(new Date(birthDate));
            const newUserId = crypto.randomBytes(16).toString('hex'); // Compatible con todo Node
            // 1. Insertar Usuario Base
            const safeEmail = email || `${newUserId}@vibe.local`; // Fallback para evitar error NOT NULL en BD
            await database_1.db.query(`INSERT INTO users (id, username, email, phone, password_hash, birth_date, gender, gender_preference, bio, occupation, zodiac_sign, vibe_color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [newUserId, username, safeEmail, phone || null, passwordHash, birthDate, gender, genderPreference, bio, occupation, zodiac, vibeColor]);
            const userId = newUserId;
            const createdUser = { id: userId, username: username, vibe_score: 100, vibe_color: vibeColor };
            // 2. Inicializar valores críticos vacíos
            await database_1.db.query(`INSERT INTO user_critical_values (user_id) VALUES ($1)`, [userId]);
            // 3. Insertar Favoritos (Música, Cine, etc.)
            if (favorites && Array.isArray(favorites)) {
                for (const fav of favorites) {
                    await database_1.db.query(`INSERT INTO user_favorites (user_id, category, item_value) VALUES ($1, $2, $3)`, [userId, fav.category, fav.value]);
                }
            }
            const token = this.generateToken(createdUser);
            if (phone) {
                this.otpStore.delete(phone); // Borramos el OTP solo tras un registro exitoso
            }
            return { success: true, user: createdUser, token };
        }
        catch (error) {
            console.error('❌ Error Crítico en el Registro:', error);
            return { success: false, message: `Fallo de Base de Datos: ${error.message || error}` };
        }
    }
    async login(identifier, password) {
        try {
            const result = await database_1.db.query(`SELECT id, username, vibe_score, password_hash FROM users WHERE email = $1 OR phone = $1`, [identifier]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                if (this.verifyPassword(password, user.password_hash)) {
                    await database_1.db.query(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
                    delete user.password_hash; // NUNCA devolver el hash al frontend
                    const token = this.generateToken(user);
                    return { success: true, user: user, token: token };
                }
            }
            return { success: false, message: 'Credenciales inválidas' };
        }
        catch (e) {
            console.error('AuthService.login error:', e);
            return { success: false, message: 'Error contactando base de datos', details: String(e) };
        }
    }
    // Login con Teléfono (Paso 2: Verificar y Entrar)
    async loginWithPhone(phone, code) {
        if (!await this.verifyOtp(phone, code)) {
            return { success: false, message: 'Código inválido o expirado' };
        }
        const result = await database_1.db.query(`SELECT * FROM users WHERE phone = $1`, [phone]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            await database_1.db.query(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
            const token = this.generateToken(user);
            this.otpStore.delete(phone); // Borramos el OTP solo tras un login exitoso
            return { success: true, user, token };
        }
        return { success: false, message: 'Número no registrado. Regístrate primero.' };
    }
    // Helper público para generar tokens (usado por login social)
    generateToken(user) {
        const issuedAt = Date.now();
        return `valid_token_${user.id}_${issuedAt}_${crypto.randomBytes(8).toString('hex')}`;
    }
    // --- NUEVAS FUNCIONES ---
    async updatePassword(userId, oldPass, newPass) {
        const check = await database_1.db.query(`SELECT id, password_hash FROM users WHERE id = $1`, [userId]);
        if (check.rows.length === 0 || !this.verifyPassword(oldPass, check.rows[0].password_hash)) {
            return { success: false, message: 'Contraseña actual incorrecta' };
        }
        const newHash = this.hashPassword(newPass);
        await database_1.db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
        return { success: true };
    }
    async checkEmailAvailability(email) {
        const res = await database_1.db.query(`SELECT id FROM users WHERE email = $1`, [email]);
        return { available: res.rows.length === 0 };
    }
    // Método de compatibilidad para evitar errores en eventcontroller.ts
    async socialLogin(provider) {
        return { success: false, message: 'Método obsoleto. Usa las rutas /auth/google o /auth/facebook.' };
    }
    // Login "Social" Real y Funcional
    // Recibe el perfil normalizado de Passport (Google/Facebook) y el color del aura
    async findOrCreateSocialUser(profile, provider, vibeColor) {
        try {
            const email = profile.emails?.[0]?.value;
            const providerId = profile.id;
            const displayName = profile.displayName || 'Usuario Vibe';
            const photoUrl = profile.photos?.[0]?.value || null; // Asegurar null si no hay foto
            if (!email)
                return { success: false, message: 'El proveedor no compartió el email.' };
            // 1. Buscar por ID de proveedor (Login recurrente)
            const idColumn = provider === 'google' ? 'google_id' : 'facebook_id';
            let result = await database_1.db.query(`SELECT * FROM users WHERE ${idColumn} = $1`, [providerId]);
            let user;
            if (result.rows.length > 0) {
                user = result.rows[0];
                // Actualizar vibe_color si se proporciona uno nuevo
                if (vibeColor) {
                    await database_1.db.query(`UPDATE users SET vibe_color = $1, last_active = CURRENT_TIMESTAMP WHERE id = $2`, [vibeColor, user.id]);
                }
                else {
                    await database_1.db.query(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
                }
            }
            else {
                // 2. Buscar por Email (Vincular cuenta existente)
                result = await database_1.db.query(`SELECT * FROM users WHERE email = $1`, [email]);
                if (result.rows.length > 0) {
                    user = result.rows[0];
                    // Vincular la cuenta social a la existente
                    await database_1.db.query(`UPDATE users SET ${idColumn} = $1 WHERE id = $2`, [providerId, user.id]);
                }
                else {
                    // 3. Crear nuevo usuario
                    const newUserId = crypto.randomBytes(16).toString('hex');
                    // Generar username único basado en el nombre
                    const baseUsername = displayName.replace(/\s+/g, '').toLowerCase();
                    const username = `${baseUsername}_${crypto.randomBytes(2).toString('hex')}`;
                    await database_1.db.query(`INSERT INTO users (id, username, email, ${idColumn}, birth_date, gender, gender_preference, vibe_color, profile_audio_url)
             VALUES ($1, $2, $3, $4, '2000-01-01', 'OTHER', 'EVERYONE', $5, $6)`, [newUserId, username, email, providerId, vibeColor || 'hsl(270, 100%, 60%)', photoUrl]);
                    user = { id: newUserId, username: username, vibe_score: 100, vibe_color: vibeColor };
                    await database_1.db.query(`INSERT INTO user_critical_values (user_id) VALUES ($1)`, [user.id]);
                }
            }
            const token = this.generateToken(user);
            return { success: true, user, token };
        }
        catch (e) {
            console.error(e);
            return { success: false, message: 'Error interno en login social' };
        }
    }
    async updatePublicKey(userId, publicKey) {
        await database_1.db.query(`UPDATE users SET public_key = $1 WHERE id = $2`, [publicKey, userId]);
        return { success: true, message: 'Identidad criptográfica sincronizada.' };
    }
}
exports.AuthService = AuthService;
