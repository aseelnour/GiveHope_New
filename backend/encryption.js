

const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // 16 bytes for AES-256-CBC

// التحقق من وجود المفتاح
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error("FATAL ERROR: ENCRYPTION_KEY is not set or invalid (must be 64 hex characters). Check your .env file and server initialization.");
 
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

/**
 * دالة تشفير القيمة
 * @param {string} text - النص المراد تشفيره
 * @returns {string} - النص المشفر بصيغة (IV:EncryptedText)
 */
function encrypt(text) {
    if (!text || typeof text !== 'string') return ''; 

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * دالة فك تشفير القيمة
 * @param {string} text - النص المشفر بصيغة (IV:EncryptedText)
 * @returns {string} - النص الأصلي
 */
function decrypt(text) {
    if (!text || typeof text !== 'string') return '';

    const parts = text.split(':');
    if (parts.length !== 2) return text; 

    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    
    try {
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("Decryption failed:", e.message);
        return 'Decryption Error'; 
    }
}

module.exports = {
    encrypt,
    decrypt
};