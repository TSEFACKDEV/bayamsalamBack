"use strict";
/**
 * 🔐 SYSTÈME DE LOGGING SÉCURISÉ - BuyAndSale
 *
 * Gestion centralisée et sécurisée des logs pour éviter l'exposition
 * d'informations sensibles en production.
 *
 * 🎯 FONCTIONNALITÉS:
 * - Filtrage automatique des données sensibles
 * - Différents niveaux de log (error, warn, info, debug)
 * - Mode production vs développement
 * - Sauvegarde sécurisée en base de données
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBusiness = exports.logSecurity = exports.logDebug = exports.logInfo = exports.logWarn = exports.logError = exports.LogLevel = void 0;
const config_js_1 = __importDefault(require("../config/config.js"));
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class SecureLogger {
    constructor() {
        this.isProduction = config_js_1.default.nodeEnv === 'production';
        this.isDevelopment = config_js_1.default.nodeEnv === 'development';
    }
    /**
     * 🧹 SANITISATION DES DONNÉES SENSIBLES
     * Supprime ou masque les informations confidentielles
     */
    sanitizeData(data) {
        if (!data || typeof data !== 'object')
            return data;
        const sensitiveFields = [
            'password', 'token', 'refreshToken', 'accessToken', 'jwt',
            'secret', 'key', 'otp', 'hash', 'salt', 'credit_card',
            'ssn', 'resetToken', 'sessionId'
        ];
        const sanitized = Object.assign({}, data);
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        // Masquer les emails partiellement
        if (sanitized.email) {
            const email = sanitized.email;
            const [local, domain] = email.split('@');
            if (local && domain) {
                sanitized.email = `${local.substring(0, 2)}***@${domain}`;
            }
        }
        // Masquer les numéros de téléphone
        if (sanitized.phone) {
            const phone = sanitized.phone.toString();
            sanitized.phone = phone.substring(0, 3) + '***' + phone.substring(phone.length - 2);
        }
        return sanitized;
    }
    /**
     * 🔍 LOGGING SÉCURISÉ - ERREURS
     */
    error(message, error, context) {
        const sanitizedError = error ? this.sanitizeData(error) : null;
        const sanitizedContext = context ? this.sanitizeData(context) : null;
        if (this.isDevelopment) {
            console.error(`❌ [ERROR] ${message}`, {
                error: sanitizedError,
                context: sanitizedContext,
                timestamp: new Date().toISOString()
            });
        }
        else {
            // En production, log simplifié sans stack trace
            console.error(`❌ [ERROR] ${message}`, {
                context: sanitizedContext,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * ⚠️ LOGGING SÉCURISÉ - AVERTISSEMENTS
     */
    warn(message, data, context) {
        const sanitizedData = data ? this.sanitizeData(data) : null;
        const sanitizedContext = context ? this.sanitizeData(context) : null;
        if (this.isDevelopment) {
            console.warn(`⚠️ [WARN] ${message}`, {
                data: sanitizedData,
                context: sanitizedContext,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * ℹ️ LOGGING SÉCURISÉ - INFORMATIONS
     */
    info(message, data, context) {
        const sanitizedData = data ? this.sanitizeData(data) : null;
        const sanitizedContext = context ? this.sanitizeData(context) : null;
        if (this.isDevelopment) {
            console.info(`ℹ️ [INFO] ${message}`, {
                data: sanitizedData,
                context: sanitizedContext,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 🐛 LOGGING SÉCURISÉ - DEBUG (développement uniquement)
     */
    debug(message, data, context) {
        if (!this.isDevelopment)
            return;
        const sanitizedData = data ? this.sanitizeData(data) : null;
        const sanitizedContext = context ? this.sanitizeData(context) : null;
        console.debug(`🐛 [DEBUG] ${message}`, {
            data: sanitizedData,
            context: sanitizedContext,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * 🔒 LOGGING DE SÉCURITÉ (toujours actif)
     */
    security(message, data, context) {
        const sanitizedData = data ? this.sanitizeData(data) : null;
        const sanitizedContext = context ? this.sanitizeData(context) : null;
        data: sanitizedData,
            context;
        sanitizedContext,
            timestamp;
        new Date().toISOString();
    }
    ;
}
/**
 * 🎯 LOG MÉTIER SPÉCIFIQUE
 */
business(action, string, data ?  : any, context ?  : LogContext);
void {
    const: sanitizedData = data ? this.sanitizeData(data) : null,
    const: sanitizedContext = context ? this.sanitizeData(context) : null,
    : .isDevelopment
};
{
    console.log(`📊 [BUSINESS] ${action}`, {
        data: sanitizedData,
        context: sanitizedContext,
        timestamp: new Date().toISOString()
    });
}
// Instance singleton
const logger = new SecureLogger();
exports.default = logger;
/**
 * 🚀 HELPERS POUR COMPATIBILITÉ
 */
const logError = (message, error, context) => logger.error(message, error, context);
exports.logError = logError;
const logWarn = (message, data, context) => logger.warn(message, data, context);
exports.logWarn = logWarn;
const logInfo = (message, data, context) => logger.info(message, data, context);
exports.logInfo = logInfo;
const logDebug = (message, data, context) => logger.debug(message, data, context);
exports.logDebug = logDebug;
const logSecurity = (message, data, context) => logger.security(message, data, context);
exports.logSecurity = logSecurity;
const logBusiness = (action, data, context) => logger.business(action, data, context);
exports.logBusiness = logBusiness;
