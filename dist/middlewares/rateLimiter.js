"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRateLimiter = exports.createProductRateLimiter = exports.uploadRateLimiter = exports.authRateLimiter = exports.RATE_LIMIT_CONFIGS = void 0;
exports.createRateLimiter = createRateLimiter;
const securityMonitor_js_1 = require("../utils/securityMonitor.js");
// Store en mémoire pour les environnements sans Redis
const memoryStore = new Map();
// 🔧 CONFIGURATIONS ADAPTATIVES PAR ENDPOINT
exports.RATE_LIMIT_CONFIGS = {
    // 🔐 Routes d'authentification - Plus strictes
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 tentatives max
        message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
    },
    // 📝 Création de contenu - Modérée
    CREATE: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 créations par minute
        message: "Limite de création atteinte. Attendez 1 minute.",
    },
    // 📖 Lecture publique - TRÈS PERMISSIVE POUR MARKETPLACE
    READ: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5000, // ✅ MARKETPLACE: Navigation libre pour tous
        message: "Trop de requêtes. Attendez quelques secondes.",
    },
    // 🔄 Updates - Modérée
    UPDATE: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20, // 20 updates par minute
        message: "Limite de modification atteinte. Attendez 1 minute.",
    },
    // 🗑️ Suppressions - Restrictive
    DELETE: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 5, // 5 suppressions max
        message: "Limite de suppression atteinte. Attendez 5 minutes.",
    },
    // 📤 Upload de fichiers - Restrictive
    UPLOAD: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5, // 5 uploads par minute
        message: "Limite d'upload atteinte. Attendez 1 minute.",
    },
};
/**
 * 🎯 DÉTECTION INTELLIGENTE DU TYPE D'ENDPOINT
 */
function detectEndpointType(req) {
    const method = req.method.toLowerCase();
    const path = req.path.toLowerCase();
    // Routes d'authentification
    if (path.includes("/auth/login") || path.includes("/auth/register")) {
        return "AUTH";
    }
    // Upload de fichiers
    if (method === "post" && path.includes("/product") && req.files) {
        return "UPLOAD";
    }
    // Par méthode HTTP
    switch (method) {
        case "post":
            return "CREATE";
        case "put":
        case "patch":
            return "UPDATE";
        case "delete":
            return "DELETE";
        case "get":
        default:
            return "READ";
    }
}
/**
 * 🔑 GÉNÉRATION DE CLÉ UNIQUE PAR UTILISATEUR/IP
 */
function generateRateLimitKey(req, type) {
    var _a;
    // Priorité : User ID > IP + User-Agent hash
    const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "anonymous";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";
    // Hash simple du User-Agent pour éviter les clés trop longues
    const uaHash = userAgent.substring(0, 10);
    return `rate_limit:${type}:${userId}:${ip}:${uaHash}`;
}
/**
 * 🚦 MIDDLEWARE PRINCIPAL DE RATE LIMITING
 */
function createRateLimiter(customConfig) {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            // 🛡️ EXEMPTION TOTALE POUR SUPER_ADMIN (doit valider toutes les annonces)
            const authUser = req.authUser;
            if (authUser && authUser.roles) {
                const isSuperAdmin = authUser.roles.some((userRole) => userRole.role && userRole.role.name === "SUPER_ADMIN");
                if (isSuperAdmin) {
                    // Aucune limite pour super admin
                    return next();
                }
            }
            // Détection automatique du type d'endpoint
            const endpointType = detectEndpointType(req);
            const config = Object.assign(Object.assign({}, exports.RATE_LIMIT_CONFIGS[endpointType]), customConfig);
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
            }
            else {
                // Incrémenter les requêtes dans le window actuel
                store.requests++;
            }
            // Calculs pour les headers
            const remaining = Math.max(0, config.maxRequests - store.requests);
            const resetTimeSeconds = Math.ceil(store.resetTime / 1000);
            // 📊 HEADERS INFORMATIFS POUR LE FRONTEND
            res.setHeader("X-RateLimit-Limit", config.maxRequests);
            res.setHeader("X-RateLimit-Remaining", remaining);
            res.setHeader("X-RateLimit-Reset", resetTimeSeconds);
            res.setHeader("X-RateLimit-Window", config.windowMs / 1000);
            res.setHeader("X-RateLimit-Type", endpointType);
            // ❌ LIMITE ATTEINTE
            if (store.requests > config.maxRequests) {
                const retryAfterSeconds = Math.ceil((store.resetTime - now) / 1000);
                res.setHeader("Retry-After", retryAfterSeconds);
                // 🚨 LOGGING DE SÉCURITÉ AVANCÉ
                console.warn(`🚦 Rate limit exceeded for ${endpointType}:`, {
                    key,
                    requests: store.requests,
                    limit: config.maxRequests,
                    ip: req.ip,
                    userAgent: req.get("User-Agent"),
                    endpoint: req.path,
                    userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "anonymous",
                });
                // 🔥 LOG AVANCÉ POUR DÉTECTION DE BRUTE FORCE
                yield (0, securityMonitor_js_1.logSecurityEvent)({
                    type: securityMonitor_js_1.SecurityEventType.RATE_LIMIT_EXCEEDED,
                    severity: store.requests > config.maxRequests * 2 ? "HIGH" : "MEDIUM",
                    details: {
                        original: `${store.requests} requests`,
                        sanitized: `${config.maxRequests} allowed`,
                        reason: `Rate limit exceeded for ${endpointType} endpoint`,
                    },
                    blocked: true,
                }, req);
                return res.status(429).json({
                    error: "Rate limit exceeded",
                    message: config.message || "Too many requests. Please try again later.",
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
                res.setHeader("X-RateLimit-Warning", "Approaching rate limit");
            }
            next();
        }
        catch (error) {
            console.error("Rate limiter error:", error);
            // En cas d'erreur, on laisse passer pour ne pas casser l'API
            next();
        }
    });
}
/**
 * 🎯 RATE LIMITERS SPÉCIALISÉS POUR ENDPOINTS CRITIQUES
 */
exports.authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
});
exports.uploadRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3,
    message: "Limite d'upload atteinte. Attendez 1 minute.",
});
exports.createProductRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: "Limite de création atteinte. Attendez 1 minute.",
});
// Rate limiter général pour toutes les routes
exports.generalRateLimiter = createRateLimiter();
/**
 * 🧹 NETTOYAGE PÉRIODIQUE DU STORE MÉMOIRE
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, store] of memoryStore.entries()) {
        if (store.resetTime <= now) {
            memoryStore.delete(key);
        }
    }
}, 5 * 60 * 1000); // Nettoyage toutes les 5 minutes
exports.default = createRateLimiter;
