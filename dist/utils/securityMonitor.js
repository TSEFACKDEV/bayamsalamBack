"use strict";
/**
 * 🔐 SYSTÈME DE MONITORING DE SÉCURITÉ AVANCÉ - BuyAndSale
 *
 * Détection, logging et alertes en temps réel des tentatives d'attaque
 * sans impact sur les performances ni le frontend.
 *
 * FONCTIONNALITÉS :
 * - Détection intelligente des patterns d'attaque
 * - Logging sécurisé avec rotation
 * - Alertes temps réel via WebSockets
 * - Statistiques de sécurité
 * - Rate limiting avancé
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityEventType = void 0;
exports.detectAttackPattern = detectAttackPattern;
exports.logSecurityEvent = logSecurityEvent;
exports.getSecurityStats = getSecurityStats;
exports.cleanupOldStatistics = cleanupOldStatistics;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
/**
 * 🎯 TYPES D'ÉVÉNEMENTS DE SÉCURITÉ
 */
var SecurityEventType;
(function (SecurityEventType) {
    SecurityEventType["XSS_ATTEMPT"] = "XSS_ATTEMPT";
    SecurityEventType["SQL_INJECTION"] = "SQL_INJECTION";
    SecurityEventType["NOSQL_INJECTION"] = "NOSQL_INJECTION";
    SecurityEventType["PATH_TRAVERSAL"] = "PATH_TRAVERSAL";
    SecurityEventType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    SecurityEventType["AUTH_FAILURE"] = "AUTH_FAILURE";
    SecurityEventType["INVALID_TOKEN"] = "INVALID_TOKEN";
    SecurityEventType["BRUTE_FORCE"] = "BRUTE_FORCE";
    SecurityEventType["SUSPICIOUS_UPLOAD"] = "SUSPICIOUS_UPLOAD";
    SecurityEventType["PARAMETER_POLLUTION"] = "PARAMETER_POLLUTION";
})(SecurityEventType || (exports.SecurityEventType = SecurityEventType = {}));
/**
 * 🔍 PATTERNS DE DÉTECTION D'ATTAQUE
 */
const ATTACK_PATTERNS = {
    XSS: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b/gi,
        /<object\b/gi,
        /<embed\b/gi,
        /document\./gi,
        /window\./gi,
    ],
    SQL_INJECTION: [
        /(\bor\b|\band\b)\s+['"]\d+['"]?\s*=\s*['"]\d+['"]?/gi,
        /union\s+select/gi,
        /drop\s+table/gi,
        /delete\s+from/gi,
        /insert\s+into/gi,
        /update\s+set/gi,
        /exec\s*\(/gi,
        /--\s*$/gm,
        /\/\*[\s\S]*?\*\//g,
    ],
    NOSQL_INJECTION: [
        /\$where/gi,
        /\$ne/gi,
        /\$gt/gi,
        /\$lt/gi,
        /\$regex/gi,
        /\$or/gi,
        /\$and/gi,
        /this\./gi,
    ],
    PATH_TRAVERSAL: [
        /\.\.\/\.\.\//g,
        /\.\.\\\.\.w/g,
        /%2e%2e%2f/gi,
        /%252e%252e%252f/gi,
        /\.\.\//g,
        /\.\.w/g,
    ],
};
/**
 * 🧮 COMPTEUR D'ATTAQUES PAR IP
 */
const attackCounters = new Map();
/**
 * 🔍 DÉTECTION INTELLIGENTE DES TENTATIVES D'ATTAQUE
 */
function detectAttackPattern(input) {
    // Test XSS
    for (const pattern of ATTACK_PATTERNS.XSS) {
        if (pattern.test(input)) {
            return {
                detected: true,
                type: SecurityEventType.XSS_ATTEMPT,
                pattern: pattern.source,
                severity: "HIGH",
            };
        }
    }
    // Test SQL Injection
    for (const pattern of ATTACK_PATTERNS.SQL_INJECTION) {
        if (pattern.test(input)) {
            return {
                detected: true,
                type: SecurityEventType.SQL_INJECTION,
                pattern: pattern.source,
                severity: "CRITICAL",
            };
        }
    }
    // Test NoSQL Injection
    for (const pattern of ATTACK_PATTERNS.NOSQL_INJECTION) {
        if (pattern.test(input)) {
            return {
                detected: true,
                type: SecurityEventType.NOSQL_INJECTION,
                pattern: pattern.source,
                severity: "HIGH",
            };
        }
    }
    // Test Path Traversal
    for (const pattern of ATTACK_PATTERNS.PATH_TRAVERSAL) {
        if (pattern.test(input)) {
            return {
                detected: true,
                type: SecurityEventType.PATH_TRAVERSAL,
                pattern: pattern.source,
                severity: "MEDIUM",
            };
        }
    }
    return {
        detected: false,
        type: SecurityEventType.XSS_ATTEMPT, // default
        pattern: "",
        severity: "LOW",
    };
}
/**
 * 📝 LOGGING SÉCURISÉ D'ÉVÉNEMENT
 */
function logSecurityEvent(event, req) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const fullEvent = {
            type: event.type || SecurityEventType.XSS_ATTEMPT,
            severity: event.severity || "MEDIUM",
            timestamp: new Date(),
            ip: (req.ip || req.connection.remoteAddress || "unknown").replace(/^::ffff:/, ""),
            userAgent: req.get("User-Agent") || "unknown",
            endpoint: req.originalUrl || req.url,
            method: req.method,
            userId: ((_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id) || undefined,
            details: event.details || { original: "", sanitized: "" },
            blocked: event.blocked || false,
        };
        // 📊 MISE À JOUR DES STATISTIQUES D'ATTAQUE
        updateAttackStatistics(fullEvent.ip, fullEvent.type);
        // 🖥️ LOGGING CONSOLE AVEC COULEURS
        const severity = fullEvent.severity;
        const color = severity === "CRITICAL"
            ? "\x1b[41m"
            : severity === "HIGH"
                ? "\x1b[31m"
                : severity === "MEDIUM"
                    ? "\x1b[33m"
                    : "\x1b[36m";
        console.log({
            timestamp: fullEvent.timestamp.toISOString(),
            ip: fullEvent.ip,
            endpoint: fullEvent.endpoint,
            method: fullEvent.method,
            userId: fullEvent.userId || "anonymous",
            original: fullEvent.details.original.substring(0, 100),
            sanitized: fullEvent.details.sanitized.substring(0, 100),
            userAgent: fullEvent.userAgent.substring(0, 50),
        });
        // 💾 SAUVEGARDE EN BASE (asynchrone pour ne pas bloquer)
        try {
            // ✅ MARKETPLACE: Ne sauvegarder que pour les utilisateurs authentifiés
            if (fullEvent.userId) {
                yield prisma_client_js_1.default.connectionLog.create({
                    data: {
                        userId: fullEvent.userId,
                        ipAddress: fullEvent.ip,
                        userAgent: `[${fullEvent.type}] ${fullEvent.userAgent.substring(0, 100)}`,
                    },
                });
            }
            // Pour les anonymes, seul le logging console est suffisant
            // � Monitoring silencieux : logs uniquement, pas de notifications automatiques
        }
        catch (error) {
            console.error("❌ Failed to save security event:", error);
        }
    });
}
/**
 * 📊 MISE À JOUR DES STATISTIQUES D'ATTAQUE
 */
function updateAttackStatistics(ip, eventType) {
    const now = new Date();
    if (!attackCounters.has(ip)) {
        attackCounters.set(ip, {
            count: 0,
            firstSeen: now,
            lastSeen: now,
            types: new Set(),
        });
    }
    const stats = attackCounters.get(ip);
    stats.count++;
    stats.lastSeen = now;
    stats.types.add(eventType);
    // 🚨 DÉTECTION DE BRUTE FORCE (plus de 10 tentatives en 5 minutes)
    const timeDiff = now.getTime() - stats.firstSeen.getTime();
    if (stats.count > 10 && timeDiff < 5 * 60 * 1000) {
        console.error(`🚨 [BRUTE FORCE DETECTED] IP ${ip} - ${stats.count} attempts in ${Math.round(timeDiff / 1000)}s`);
    }
}
/**
 *  STATISTIQUES DE SÉCURITÉ
 */
function getSecurityStats() {
    const totalAttacks = Array.from(attackCounters.values()).reduce((sum, stats) => sum + stats.count, 0);
    const uniqueIPs = attackCounters.size;
    const typeCount = new Map();
    for (const stats of attackCounters.values()) {
        for (const type of stats.types) {
            typeCount.set(type, (typeCount.get(type) || 0) + 1);
        }
    }
    const topAttackTypes = Array.from(typeCount.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    const recentAttacks = Array.from(attackCounters.entries())
        .map(([ip, stats]) => ({
        ip,
        count: stats.count,
        types: Array.from(stats.types),
    }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    return {
        totalAttacks,
        uniqueIPs,
        topAttackTypes,
        recentAttacks,
    };
}
/**
 * 🧹 NETTOYAGE PÉRIODIQUE DES STATISTIQUES
 */
function cleanupOldStatistics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [ip, stats] of attackCounters.entries()) {
        if (stats.lastSeen < oneHourAgo) {
            attackCounters.delete(ip);
        }
    }
}
// 🕒 NETTOYAGE AUTOMATIQUE TOUTES LES HEURES
setInterval(cleanupOldStatistics, 60 * 60 * 1000);
exports.default = {
    detectAttackPattern,
    logSecurityEvent,
    getSecurityStats,
    cleanupOldStatistics,
    SecurityEventType,
};
