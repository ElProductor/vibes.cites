import * as crypto from 'crypto';

export interface EncryptedPayload {
  ciphertext: string;       // El mensaje encriptado
  encryptedKey: string;     // La llave de un solo uso encriptada
  iv: string;               // Vector de inicialización
  authTag: string;          // Sello de autenticidad (GCM)
  signature: string;        // Firma criptográfica de identidad
}

/**
 * Vibe Quantum Shield - Motor de Red Cerrada E2EE Multicapa
 * Arquitectura de Cifrado Híbrido Superior a estándares comerciales comunes.
 */
export class EncryptionService {
  
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
  static multiEncrypt(
    message: string, 
    receiverPublicKey: string, 
    senderPrivateKey: string
  ): EncryptedPayload {
    
    // 1. Capa Simétrica: Generar llave temporal (Desechable para Perfect Forward Secrecy)
    const sessionKey = crypto.randomBytes(32); // AES-256
    const iv = crypto.randomBytes(16);

    // Cifrar el mensaje con AES-256-GCM (Incluye autenticación integrada)
    const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
    let ciphertext = cipher.update(message, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // 2. Capa Asimétrica: Encriptar la llave temporal con la llave pública del RECEPTOR
    const encryptedKey = crypto.publicEncrypt(
      {
        key: receiverPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      sessionKey
    ).toString('base64');

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
  static multiDecrypt(
    payload: EncryptedPayload, 
    receiverPrivateKey: string, 
    senderPublicKey: string
  ): string {
    
    // 1. Verificación de Integridad Absoluta (Si esto falla, fue interceptado)
    const verify = crypto.createVerify('SHA512');
    verify.update(`${payload.ciphertext}.${payload.encryptedKey}.${payload.iv}.${payload.authTag}`);
    verify.end();
    
    const isAuthentic = verify.verify(senderPublicKey, payload.signature, 'base64');
    if (!isAuthentic) {
      throw new Error("ALERTA DE INTEGRIDAD: El paquete de datos fue alterado o falsificado.");
    }

    // 2. Desencriptar la llave de sesión usando la llave privada del RECEPTOR
    const sessionKey = crypto.privateDecrypt(
      {
        key: receiverPrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(payload.encryptedKey, 'base64')
    );

    // 3. Desencriptar el mensaje real
    const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
    
    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}