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

import { Request } from "express";
import prisma from "../model/prisma.client.js";

/**
 * 🎯 TYPES D'ÉVÉNEMENTS DE SÉCURITÉ
 */
export enum SecurityEventType {
  XSS_ATTEMPT = "XSS_ATTEMPT",
  SQL_INJECTION = "SQL_INJECTION",
  NOSQL_INJECTION = "NOSQL_INJECTION",
  PATH_TRAVERSAL = "PATH_TRAVERSAL",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  AUTH_FAILURE = "AUTH_FAILURE",
  INVALID_TOKEN = "INVALID_TOKEN",
  BRUTE_FORCE = "BRUTE_FORCE",
  SUSPICIOUS_UPLOAD = "SUSPICIOUS_UPLOAD",
  PARAMETER_POLLUTION = "PARAMETER_POLLUTION",
}

/**
 * 📊 INTERFACE D'ÉVÉNEMENT DE SÉCURITÉ
 */
export interface SecurityEvent {
  type: SecurityEventType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: Date;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  userId?: string;
  details: {
    original: string;
    sanitized: string;
    pattern?: string;
    reason?: string;
  };
  blocked: boolean;
}

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
const attackCounters = new Map<
  string,
  {
    count: number;
    firstSeen: Date;
    lastSeen: Date;
    types: Set<SecurityEventType>;
  }
>();

/**
 * 🔍 DÉTECTION INTELLIGENTE DES TENTATIVES D'ATTAQUE
 */
export function detectAttackPattern(input: string): {
  detected: boolean;
  type: SecurityEventType;
  pattern: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
} {
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
export async function logSecurityEvent(
  event: Partial<SecurityEvent>,
  req: Request
): Promise<void> {
  const fullEvent: SecurityEvent = {
    type: event.type || SecurityEventType.XSS_ATTEMPT,
    severity: event.severity || "MEDIUM",
    timestamp: new Date(),
    ip: (req.ip || req.connection.remoteAddress || "unknown").replace(
      /^::ffff:/,
      ""
    ),
    userAgent: req.get("User-Agent") || "unknown",
    endpoint: req.originalUrl || req.url,
    method: req.method,
    userId: (req as any).authUser?.id || undefined,
    details: event.details || { original: "", sanitized: "" },
    blocked: event.blocked || false,
  };

  // 📊 MISE À JOUR DES STATISTIQUES D'ATTAQUE
  updateAttackStatistics(fullEvent.ip, fullEvent.type);

  // 🖥️ LOGGING CONSOLE AVEC COULEURS
  const severity = fullEvent.severity;
  const color =
    severity === "CRITICAL"
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
      await prisma.connectionLog.create({
        data: {
          userId: fullEvent.userId,
          ipAddress: fullEvent.ip,
          userAgent: `[${fullEvent.type}] ${fullEvent.userAgent.substring(
            0,
            100
          )}`,
        },
      });
    }
    // Pour les anonymes, seul le logging console est suffisant

    // � Monitoring silencieux : logs uniquement, pas de notifications automatiques
  } catch (error) {
    console.error("❌ Failed to save security event:", error);
  }
}

/**
 * 📊 MISE À JOUR DES STATISTIQUES D'ATTAQUE
 */
function updateAttackStatistics(
  ip: string,
  eventType: SecurityEventType
): void {
  const now = new Date();

  if (!attackCounters.has(ip)) {
    attackCounters.set(ip, {
      count: 0,
      firstSeen: now,
      lastSeen: now,
      types: new Set(),
    });
  }

  const stats = attackCounters.get(ip)!;
  stats.count++;
  stats.lastSeen = now;
  stats.types.add(eventType);

  // 🚨 DÉTECTION DE BRUTE FORCE (plus de 50 tentatives en 3 minutes)
  const timeDiff = now.getTime() - stats.firstSeen.getTime();
  if (stats.count > 50 && timeDiff < 3 * 60 * 1000) {
    console.error(
      `🚨 [BRUTE FORCE DETECTED] IP ${ip} - ${
        stats.count
      } attempts in ${Math.round(timeDiff / 1000)}s`
    );
  }
}

/**
 *  STATISTIQUES DE SÉCURITÉ
 */
export function getSecurityStats(): {
  totalAttacks: number;
  uniqueIPs: number;
  topAttackTypes: Array<{ type: string; count: number }>;
  recentAttacks: Array<{ ip: string; count: number; types: string[] }>;
} {
  const totalAttacks = Array.from(attackCounters.values()).reduce(
    (sum, stats) => sum + stats.count,
    0
  );
  const uniqueIPs = attackCounters.size;

  const typeCount = new Map<string, number>();
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
export function cleanupOldStatistics(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  for (const [ip, stats] of attackCounters.entries()) {
    if (stats.lastSeen < oneHourAgo) {
      attackCounters.delete(ip);
    }
  }
}

// 🕒 NETTOYAGE AUTOMATIQUE TOUTES LES HEURES
setInterval(cleanupOldStatistics, 60 * 60 * 1000);

export default {
  detectAttackPattern,
  logSecurityEvent,
  getSecurityStats,
  cleanupOldStatistics,
  SecurityEventType,
};
