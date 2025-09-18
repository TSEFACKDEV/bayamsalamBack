"use strict";
/**
 * 🛡️ PROTECTION CSRF SIMPLE - BuyAndSale
 *
 * Middleware CSRF léger compatible avec l'architecture existante :
 * - JWT Bearer tokens + httpOnly cookies
 * - Sessions Express
 * - Frontend React SPA
 *
 * STRATÉGIE SIMPLE :
 * - Double Submit Cookie Pattern
 * - Vérification de l'origin pour les requêtes sensibles
 * - Exemptions pour les APIs publiques (login/register)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectCSRFToken = injectCSRFToken;
exports.protectCSRF = protectCSRF;
exports.exposeCSRFToken = exposeCSRFToken;
const crypto_1 = __importDefault(require("crypto"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const config_js_1 = __importDefault(require("../config/config.js"));
/**
 * 🔧 CONFIGURATION CSRF
 */
const CSRF_CONFIG = {
    COOKIE_NAME: 'csrf-token',
    HEADER_NAME: 'x-csrf-token',
    TOKEN_LENGTH: 32,
    COOKIE_OPTIONS: {
        httpOnly: false, // Doit être accessible au JS pour être envoyé dans les headers
        secure: config_js_1.default.nodeEnv === 'production',
        sameSite: config_js_1.default.nodeEnv === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
    }
};
/**
 * 🚫 ROUTES EXEMPTÉES DE LA VÉRIFICATION CSRF
 */
const EXEMPT_ROUTES = [
    // Authentification (première connexion)
    '/auth/login',
    '/auth/register',
    '/auth/refresh-token',
    '/auth/forgot-password',
    '/auth/reset-password',
    // Routes publiques en lecture
    '/product',
    '/category',
    '/city',
    // Health check
    '/',
    '/health'
];
/**
 * 🔒 MÉTHODES NÉCESSITANT UNE PROTECTION CSRF
 */
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
/**
 * 🎯 ORIGINS AUTORISÉS (basé sur votre config CORS)
 */
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174'
];
/**
 * 🛡️ GÉNÉRATEUR DE TOKEN CSRF
 */
function generateCSRFToken() {
    return crypto_1.default.randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString('hex');
}
/**
 * 🔍 VÉRIFICATION SI LA ROUTE EST EXEMPTÉE
 */
function isExemptRoute(path) {
    return EXEMPT_ROUTES.some(exempt => path === exempt ||
        path.startsWith(exempt + '/') ||
        path.endsWith(exempt));
}
/**
 * 🔍 VÉRIFICATION DE L'ORIGIN
 */
function isValidOrigin(origin) {
    if (!origin)
        return false;
    return ALLOWED_ORIGINS.includes(origin);
}
/**
 * 🍪 MIDDLEWARE D'INJECTION DU TOKEN CSRF
 * Ajoute un token CSRF à toutes les réponses pour les routes protégées
 */
function injectCSRFToken() {
    return (req, res, next) => {
        // Skip pour les requêtes exemptées ou en lecture seule
        if (!PROTECTED_METHODS.includes(req.method) || isExemptRoute(req.path)) {
            return next();
        }
        // Générer ou récupérer le token CSRF existant
        let csrfToken = req.cookies[CSRF_CONFIG.COOKIE_NAME];
        if (!csrfToken) {
            csrfToken = generateCSRFToken();
            res.cookie(CSRF_CONFIG.COOKIE_NAME, csrfToken, CSRF_CONFIG.COOKIE_OPTIONS);
        }
        // Ajouter le token dans la réponse pour que le frontend puisse l'utiliser
        res.locals.csrfToken = csrfToken;
        next();
    };
}
/**
 * 🛡️ MIDDLEWARE PRINCIPAL DE PROTECTION CSRF
 */
function protectCSRF() {
    return (req, res, next) => {
        // Skip pour les méthodes non-sensibles (GET, HEAD, OPTIONS)
        if (!PROTECTED_METHODS.includes(req.method)) {
            return next();
        }
        // Skip pour les routes exemptées
        if (isExemptRoute(req.path)) {
            return next();
        }
        // 🔍 VÉRIFICATION DE L'ORIGIN (première ligne de défense)
        const origin = req.get('Origin') || req.get('Referer');
        if (!isValidOrigin(origin)) {
            console.warn(`🚨 CSRF: Origin invalide détecté`, {
                origin,
                ip: req.ip,
                path: req.path,
                method: req.method
            });
            return response_js_1.default.error(res, 'Origine de la requête non autorisée', {
                code: 'INVALID_ORIGIN',
                message: 'Cette requête doit provenir du site autorisé'
            }, 403);
        }
        // 🍪 VÉRIFICATION DU DOUBLE SUBMIT COOKIE
        const cookieToken = req.cookies[CSRF_CONFIG.COOKIE_NAME];
        const headerToken = req.get(CSRF_CONFIG.HEADER_NAME);
        // Token manquant dans le cookie
        if (!cookieToken) {
            console.warn(`🚨 CSRF: Token cookie manquant`, {
                ip: req.ip,
                path: req.path,
                method: req.method
            });
            return response_js_1.default.error(res, 'Token de sécurité requis', {
                code: 'CSRF_TOKEN_MISSING',
                message: 'Un token de sécurité est requis pour cette action'
            }, 403);
        }
        // Token manquant dans le header
        if (!headerToken) {
            console.warn(`🚨 CSRF: Token header manquant`, {
                ip: req.ip,
                path: req.path,
                method: req.method,
                hasCookie: !!cookieToken
            });
            return response_js_1.default.error(res, 'Header de sécurité requis', {
                code: 'CSRF_HEADER_MISSING',
                message: 'Le header X-CSRF-Token est requis'
            }, 403);
        }
        // 🔐 VÉRIFICATION QUE LES TOKENS CORRESPONDENT
        if (cookieToken !== headerToken) {
            console.warn(`🚨 CSRF: Tokens ne correspondent pas`, {
                ip: req.ip,
                path: req.path,
                method: req.method,
                cookieLength: cookieToken.length,
                headerLength: headerToken.length
            });
            return response_js_1.default.error(res, 'Token de sécurité invalide', {
                code: 'CSRF_TOKEN_MISMATCH',
                message: 'Les tokens de sécurité ne correspondent pas'
            }, 403);
        }
        // ✅ PROTECTION CSRF VALIDÉE
        next();
    };
}
/**
 * 🎯 MIDDLEWARE POUR EXPOSER LE TOKEN CSRF AU FRONTEND
 */
function exposeCSRFToken() {
    return (req, res) => {
        const csrfToken = generateCSRFToken();
        // Définir le cookie
        res.cookie(CSRF_CONFIG.COOKIE_NAME, csrfToken, CSRF_CONFIG.COOKIE_OPTIONS);
        // Retourner le token dans la réponse
        response_js_1.default.success(res, 'Token CSRF généré', {
            csrfToken,
            instruction: 'Incluez ce token dans le header X-CSRF-Token pour vos requêtes'
        });
    };
}
exports.default = protectCSRF;
