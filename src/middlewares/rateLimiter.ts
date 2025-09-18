import { Request, Response, NextFunction } from 'express';
import {
  logSecurityEvent,
  SecurityEventType,
} from '../utils/securityMonitor.js';
// import { Redis } from 'ioredis'; // Optionnel pour usage futur avec Redis

/**
 * 🚦 RATE LIMITER AVANCÉ AVEC HEADERS INFORMATIFS
 *
 * Configuration adaptative selon les endpoints et types d'utilisateurs
 * Headers informatifs pour que le frontend puisse gérer gracieusement les limitations
 *
 * Headers retournés :
 * - X-RateLimit-Limit: Nombre de requêtes autorisées
 * - X-RateLimit-Remaining: Requêtes restantes
 * - X-RateLimit-Reset: Timestamp de reset (Unix)
 * - Retry-After: Secondes à attendre si limite atteinte
 */

interface RateLimitConfig {
  windowMs: number; // Fenêtre de temps en millisecondes
  maxRequests: number; // Nombre max de requêtes
  message?: string; // Message personnalisé
  skipIf?: (req: Request) => boolean; // Condition pour ignorer le rate limiting
}

interface RateLimitStore {
  requests: number;
  resetTime: number;
}

// Store en mémoire pour les environnements sans Redis
const memoryStore = new Map<string, RateLimitStore>();

// 🔧 CONFIGURATIONS ADAPTATIVES PAR ENDPOINT
export const RATE_LIMIT_CONFIGS = {
  // 🔐 Routes d'authentification - Plus strictes
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 tentatives max
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  },

  // 📝 Création de contenu - Modérée
  CREATE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 créations par minute
    message: 'Limite de création atteinte. Attendez 1 minute.',
  },

  // 📖 Lecture publique - Permissive
  READ: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 lectures par minute
    message: 'Trop de requêtes. Attendez quelques secondes.',
  },

  // 🔄 Updates - Modérée
  UPDATE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 updates par minute
    message: 'Limite de modification atteinte. Attendez 1 minute.',
  },

  // 🗑️ Suppressions - Restrictive
  DELETE: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // 5 suppressions max
    message: 'Limite de suppression atteinte. Attendez 5 minutes.',
  },

  // 📤 Upload de fichiers - Restrictive
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads par minute
    message: "Limite d'upload atteinte. Attendez 1 minute.",
  },
} as const;

/**
 * 🎯 DÉTECTION INTELLIGENTE DU TYPE D'ENDPOINT
 */
function detectEndpointType(req: Request): keyof typeof RATE_LIMIT_CONFIGS {
  const method = req.method.toLowerCase();
  const path = req.path.toLowerCase();

  // Routes d'authentification
  if (path.includes('/auth/login') || path.includes('/auth/register')) {
    return 'AUTH';
  }

  // Upload de fichiers
  if (method === 'post' && path.includes('/product') && req.files) {
    return 'UPLOAD';
  }

  // Par méthode HTTP
  switch (method) {
    case 'post':
      return 'CREATE';
    case 'put':
    case 'patch':
      return 'UPDATE';
    case 'delete':
      return 'DELETE';
    case 'get':
    default:
      return 'READ';
  }
}

/**
 * 🔑 GÉNÉRATION DE CLÉ UNIQUE PAR UTILISATEUR/IP
 */
function generateRateLimitKey(req: Request, type: string): string {
  // Priorité : User ID > IP + User-Agent hash
  const userId = (req.user as any)?.id || 'anonymous';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  // Hash simple du User-Agent pour éviter les clés trop longues
  const uaHash = userAgent.substring(0, 10);

  return `rate_limit:${type}:${userId}:${ip}:${uaHash}`;
}

/**
 * 🚦 MIDDLEWARE PRINCIPAL DE RATE LIMITING
 */
export function createRateLimiter(customConfig?: Partial<RateLimitConfig>) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      // Détection automatique du type d'endpoint
      const endpointType = detectEndpointType(req);
      const config = { ...RATE_LIMIT_CONFIGS[endpointType], ...customConfig };

      // Skip si condition définie
      if (config.skipIf && config.skipIf(req)) {
        return next();
      }

      const key = generateRateLimitKey(req, endpointType);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Récupération des données actuelles
      let store = memoryStore.get(key);

      if (!store || store.resetTime <= now) {
        // Nouveau window ou window expiré
        store = {
          requests: 1,
          resetTime: now + config.windowMs,
        };
        memoryStore.set(key, store);
      } else {
        // Incrémenter les requêtes dans le window actuel
        store.requests++;
      }

      // Calculs pour les headers
      const remaining = Math.max(0, config.maxRequests - store.requests);
      const resetTimeSeconds = Math.ceil(store.resetTime / 1000);

      // 📊 HEADERS INFORMATIFS POUR LE FRONTEND
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTimeSeconds);
      res.setHeader('X-RateLimit-Window', config.windowMs / 1000);
      res.setHeader('X-RateLimit-Type', endpointType);

      // ❌ LIMITE ATTEINTE
      if (store.requests > config.maxRequests) {
        const retryAfterSeconds = Math.ceil((store.resetTime - now) / 1000);

        res.setHeader('Retry-After', retryAfterSeconds);

        // 🚨 LOGGING DE SÉCURITÉ AVANCÉ
        console.warn(`🚦 Rate limit exceeded for ${endpointType}:`, {
          key,
          requests: store.requests,
          limit: config.maxRequests,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          userId: (req.user as any)?.id || 'anonymous',
        });

        // 🔥 LOG AVANCÉ POUR DÉTECTION DE BRUTE FORCE
        await logSecurityEvent(
          {
            type: SecurityEventType.RATE_LIMIT_EXCEEDED,
            severity:
              store.requests > config.maxRequests * 2 ? 'HIGH' : 'MEDIUM',
            details: {
              original: `${store.requests} requests`,
              sanitized: `${config.maxRequests} allowed`,
              reason: `Rate limit exceeded for ${endpointType} endpoint`,
            },
            blocked: true,
          },
          req
        );

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message:
            config.message || 'Too many requests. Please try again later.',
          retryAfter: retryAfterSeconds,
          type: endpointType,
          details: {
            limit: config.maxRequests,
            windowSeconds: config.windowMs / 1000,
            remaining: 0,
            resetAt: new Date(store.resetTime).toISOString(),
          },
        });
      }

      // ⚠️ WARNING À 80% DE LA LIMITE
      if (store.requests >= config.maxRequests * 0.8) {
        res.setHeader('X-RateLimit-Warning', 'Approaching rate limit');
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // En cas d'erreur, on laisse passer pour ne pas casser l'API
      next();
    }
  };
}

/**
 * 🎯 RATE LIMITERS SPÉCIALISÉS POUR ENDPOINTS CRITIQUES
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3,
  message: "Limite d'upload atteinte. Attendez 1 minute.",
});

export const createProductRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Limite de création atteinte. Attendez 1 minute.',
});

// Rate limiter général pour toutes les routes
export const generalRateLimiter = createRateLimiter();

/**
 * 🧹 NETTOYAGE PÉRIODIQUE DU STORE MÉMOIRE
 */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, store] of memoryStore.entries()) {
      if (store.resetTime <= now) {
        memoryStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
); // Nettoyage toutes les 5 minutes

export default createRateLimiter;
