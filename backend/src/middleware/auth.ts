import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RouterConfig } from '../services/RouterConnectionService';

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Please configure it in your .env file.');
}

if (JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long.');
}

export interface UserPayload {
    userId: string;
    username: string;
    activeRouterId?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
            routerConfig?: RouterConfig;
            activeRouterId?: string;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No session found' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            activeRouterId: decoded.activeRouterId
        };

        next();
    } catch (error) {
        return res.status(403).json({ error: 'Unauthorized: Invalid session' });
    }
};

export const routerAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No session found' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            activeRouterId: decoded.activeRouterId
        };

        if (!decoded.activeRouterId) {
            return res.status(400).json({ error: 'No active router selected' });
        }

        const { UserService } = await import('../services/UserService');
        const router = await UserService.getRouterWithPassword(decoded.userId, decoded.activeRouterId);

        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        req.routerConfig = {
            host: router.host,
            user: router.user,
            password: router.password,
            port: router.port
        };

        next();
    } catch (error) {
        return res.status(403).json({ error: 'Unauthorized: Invalid session' });
    }
};