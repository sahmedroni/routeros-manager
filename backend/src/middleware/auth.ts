import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { decrypt } from '../utils/crypto';
import { RouterConfig } from '../services/RouterConnectionService';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';

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
