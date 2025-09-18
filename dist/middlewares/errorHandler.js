"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const config_js_1 = __importDefault(require("../config/config.js"));
const errorHandler = (err, req, res, next) => {
    // 🔐 LOG SÉCURISÉ - Toujours logger les erreurs pour le debug
    console.error('=== ERREUR SERVEUR ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('URL:', req.method, req.url);
    console.error('Error:', err.message);
    // En développement, afficher la stack trace complète
    if (config_js_1.default.nodeEnv === 'development') {
        console.error('Stack trace:', err.stack);
    }
    console.error('=== FIN ERREUR ===');
    // 🛡️ RÉPONSES SÉCURISÉES - Ne pas exposer de détails sensibles
    // Erreurs de validation Yup
    if (err.name === 'ValidationError') {
        return response_js_1.default.error(res, 'Données de validation invalides', null, 400);
    }
    // Erreurs JWT
    if (err.name === 'JsonWebTokenError') {
        return response_js_1.default.error(res, 'Token invalide', null, 401);
    }
    if (err.name === 'TokenExpiredError') {
        return response_js_1.default.error(res, 'Session expirée', null, 401);
    }
    // Erreurs Prisma (base de données)
    if (err.code === 'P2002') {
        return response_js_1.default.error(res, 'Cette donnée existe déjà', null, 409);
    }
    if (err.code === 'P2025') {
        return response_js_1.default.error(res, 'Ressource non trouvée', null, 404);
    }
    if (err.code && err.code.startsWith('P')) {
        return response_js_1.default.error(res, 'Erreur de base de données', null, 500);
    }
    // Erreurs de syntaxe JSON
    if (err instanceof SyntaxError && 'body' in err) {
        return response_js_1.default.error(res, 'Format de données invalide', null, 400);
    }
    // 🚨 ERREUR GÉNÉRIQUE - Ne jamais exposer les détails
    const isDev = config_js_1.default.nodeEnv === 'development';
    return response_js_1.default.error(res, 'Erreur interne du serveur', isDev
        ? {
            message: err.message,
            // En dev seulement, on peut donner plus de contexte
            type: err.name,
        }
        : null, 500);
};
exports.errorHandler = errorHandler;
