import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { decrypt } from '../utils/crypto';
import { RouterConfig } from '../services/RouterConnectionService';

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Please configure it in your .env file.');
}

if (JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long.');
}

interface JwtPayload {
    host: string;
    user: string;
    encryptedPass: string;
    port: number;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No session found' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        const password = decrypt(decoded.encryptedPass);

        req.routerConfig = {
            host: decoded.host,
            user: decoded.user,
            password: password,
            port: decoded.port
        };

        next();
    } catch (error) {
        return res.status(403).json({ error: 'Unauthorized: Invalid session' });
    }
};
