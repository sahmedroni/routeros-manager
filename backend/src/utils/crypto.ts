import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY as string;

if (!ENCRYPTION_KEY) {
    throw new Error('FATAL: ENCRYPTION_KEY environment variable is not set. Please configure it in your .env file.');
}

if (ENCRYPTION_KEY.length < 32) {
    throw new Error('FATAL: ENCRYPTION_KEY must be at least 32 characters long.');
}

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

function deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

export const encrypt = (text: string): string => {
    const salt = crypto.randomBytes(16);
    const key = deriveKey(ENCRYPTION_KEY, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
    const parts = text.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    const key = deriveKey(ENCRYPTION_KEY, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
