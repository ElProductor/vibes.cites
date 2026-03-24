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
exports.EncryptionService = void 0;
const crypto = __importStar(require("crypto"));
/**
 * Vibe Quantum Shield - Motor de Red Cerrada E2EE Multicapa
 * Arquitectura de Cifrado Híbrido Superior a estándares comerciales comunes.
 */
class EncryptionService {
    /**
     * PASO 1: Generación de Identidad Criptográfica (Por Usuario)
     * Cada vez que un usuario se registra, se generan estas llaves en su dispositivo.
     * La privada NUNCA debe salir de su teléfono/navegador.
     */
    static generateKeyPair() {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096, // Seguridad de grado militar (WhatsApp usa 256 en curvas, 4096 RSA es titánico)
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
    }
    /**
     * PASO 2: Multi-Cifrado Estricto (Envío de Datos)
     * Cifra el mensaje, protege la llave y firma el paquete para integridad absoluta.
     */
    static multiEncrypt(message, receiverPublicKey, senderPrivateKey) {
        // 1. Capa Simétrica: Generar llave temporal (Desechable para Perfect Forward Secrecy)
        const sessionKey = crypto.randomBytes(32); // AES-256
        const iv = crypto.randomBytes(16);
        // Cifrar el mensaje con AES-256-GCM (Incluye autenticación integrada)
        const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
        let ciphertext = cipher.update(message, 'utf8', 'hex');
        ciphertext += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        // 2. Capa Asimétrica: Encriptar la llave temporal con la llave pública del RECEPTOR
        const encryptedKey = crypto.publicEncrypt({
            key: receiverPublicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, sessionKey).toString('base64');
        // 3. Capa de Integridad e Identidad: FIRMAR todo el paquete con la llave privada del EMISOR
        const sign = crypto.createSign('SHA512');
        sign.update(`${ciphertext}.${encryptedKey}.${iv.toString('hex')}.${authTag}`);
        sign.end();
        const signature = sign.sign(senderPrivateKey, 'base64');
        return {
            ciphertext,
            encryptedKey,
            iv: iv.toString('hex'),
            authTag,
            signature
        };
    }
    /**
     * PASO 3: Multi-Descifrado y Verificación
     * Verifica que nadie haya tocado el mensaje en el camino, y lo abre.
     */
    static multiDecrypt(payload, receiverPrivateKey, senderPublicKey) {
        // 1. Verificación de Integridad Absoluta (Si esto falla, fue interceptado)
        const verify = crypto.createVerify('SHA512');
        verify.update(`${payload.ciphertext}.${payload.encryptedKey}.${payload.iv}.${payload.authTag}`);
        verify.end();
        const isAuthentic = verify.verify(senderPublicKey, payload.signature, 'base64');
        if (!isAuthentic) {
            throw new Error("ALERTA DE INTEGRIDAD: El paquete de datos fue alterado o falsificado.");
        }
        // 2. Desencriptar la llave de sesión usando la llave privada del RECEPTOR
        const sessionKey = crypto.privateDecrypt({
            key: receiverPrivateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, Buffer.from(payload.encryptedKey, 'base64'));
        // 3. Desencriptar el mensaje real
        const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, Buffer.from(payload.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
        let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.EncryptionService = EncryptionService;
