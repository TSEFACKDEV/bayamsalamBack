/**
 * 📊 CONTRÔLEUR DE MONITORING DE SÉCURITÉ - BuyAndSale
 *
 * Endpoints pour visualiser les statistiques et événements de sécurité
 * Accessible uniquement aux super administrateurs
 */

import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import { getSecurityStats } from "../utils/securityMonitor.js";
import prisma from "../model/prisma.client.js";

/**
 * 📈 STATISTIQUES GÉNÉRALES DE SÉCURITÉ
 */
export const getSecurityStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Statistiques en temps réel
    const realtimeStats = getSecurityStats();

    // Statistiques de base de données (dernières 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dbStats = await prisma.connectionLog.groupBy({
      by: ["ipAddress"],
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
      _count: {
        ipAddress: true,
      },
      orderBy: {
        _count: {
          ipAddress: "desc",
        },
      },
      take: 10,
    });

    // Connexions par heure (dernières 24h)
    const hourlyConnections = await prisma.$queryRaw`
      SELECT 
        HOUR(createdAt) as hour,
        COUNT(*) as connections
      FROM ConnectionLog 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY HOUR(createdAt)
      ORDER BY hour
    `;

    const response = {
      realtime: realtimeStats,
      database: {
        topIPs: dbStats,
        hourlyActivity: hourlyConnections,
      },
      summary: {
        securityScore: calculateSecurityScore(realtimeStats),
        threatLevel: determineThreatLevel(realtimeStats),
        recommendations: generateSecurityRecommendations(realtimeStats),
      },
    };

    return ResponseApi.success(
      res,
      "Security statistics retrieved successfully",
      response
    );
  } catch (error: any) {
    console.error("🚨 Error fetching security statistics:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      user: (req as any).user?.id,
    });

    // Gestion d'erreurs spécifiques
    if (error.code === "P2002") {
      return ResponseApi.error(
        res,
        "Conflit dans la récupération des données de sécurité",
        "Violation de contrainte de données dupliquées",
        409
      );
    }

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return ResponseApi.error(
        res,
        "Service de surveillance de sécurité indisponible",
        "Erreur de connexion à la base de données",
        503
      );
    }

    if (error.name === "PrismaClientKnownRequestError") {
      return ResponseApi.error(
        res,
        "Security data access error",
        "Database query failed",
        422
      );
    }

    return ResponseApi.error(
      res,
      "Échec de récupération des statistiques de sécurité",
      process.env.NODE_ENV === "development"
        ? error.message
        : "Erreur serveur interne",
      500
    );
  }
};

/**
 * 📋 ÉVÉNEMENTS DE SÉCURITÉ RÉCENTS
 */
export const getRecentSecurityEvents = async (
  req: Request,
  res: Response
): Promise<any> => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    // Récupérer les logs de sécurité depuis ConnectionLog
    // (on filtre ceux qui contiennent des types d'événements de sécurité)
    const events = await prisma.connectionLog.findMany({
      where: {
        userAgent: {
          contains: "[",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const parsedEvents = events.map((event) => {
      // Parser le userAgent pour extraire le type d'événement
      const match = event.userAgent.match(/\[([^\]]+)\]/);
      const eventType = match ? match[1] : "UNKNOWN";

      return {
        id: event.id,
        type: eventType,
        timestamp: event.createdAt,
        ip: event.ipAddress,
        userId: event.userId,
        userAgent: event.userAgent.replace(/\[[^\]]+\]\s*/, ""),
        severity: determineSeverityFromType(eventType),
      };
    });

    return ResponseApi.success(
      res,
      "Recent security events retrieved successfully",
      {
        events: parsedEvents,
        pagination: {
          limit,
          offset,
          total: events.length,
        },
      }
    );
  } catch (error: any) {
    console.error("🚨 Error fetching security events:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      params: { limit, offset },
    });

    // Gestion d'erreurs spécifiques
    if (error.code === "P2025") {
      return ResponseApi.error(
        res,
        "Security events not found",
        "No security events match the criteria",
        404
      );
    }

    if (error.name === "PrismaClientValidationError") {
      return ResponseApi.error(
        res,
        "Invalid security events query parameters",
        "Query validation failed",
        400
      );
    }

    return ResponseApi.error(
      res,
      "Failed to retrieve security events",
      process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error",
      500
    );
  }
};

/**
 * 🎯 ANALYSE D'UNE IP SPÉCIFIQUE
 */
export const analyzeIP = async (req: Request, res: Response): Promise<any> => {
  const { ip } = req.params;

  try {
    if (!ip) {
      return ResponseApi.error(res, "IP address is required", null, 400);
    }

    // Historique de cette IP
    const ipHistory = await prisma.connectionLog.findMany({
      where: {
        ipAddress: ip,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    // Analyser les patterns
    const analysis = {
      totalRequests: ipHistory.length,
      firstSeen: ipHistory[ipHistory.length - 1]?.createdAt,
      lastSeen: ipHistory[0]?.createdAt,
      uniqueUserAgents: [...new Set(ipHistory.map((h) => h.userAgent))].length,
      securityEvents: ipHistory.filter((h) => h.userAgent.includes("[")).length,
      users: [...new Set(ipHistory.map((h) => h.userId))],
      timeline: ipHistory.slice(0, 20), // 20 événements les plus récents
    };

    // Score de risque
    const riskScore = calculateIPRiskScore(analysis);

    return ResponseApi.success(res, "IP analysis completed successfully", {
      ip,
      analysis,
      riskScore,
      recommendation: getRiskRecommendation(riskScore),
    });
  } catch (error: any) {
    console.error("🚨 Error analyzing IP:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      ip: ip,
    });

    // Gestion d'erreurs spécifiques
    if (error.code === "P2025") {
      return ResponseApi.error(
        res,
        "IP analysis data not found",
        `No connection logs found for IP: ${ip}`,
        404
      );
    }

    if (error.name === "PrismaClientValidationError") {
      return ResponseApi.error(
        res,
        "Invalid IP analysis parameters",
        "IP address format validation failed",
        400
      );
    }

    if (error.message.includes("timeout")) {
      return ResponseApi.error(
        res,
        "IP analysis timeout",
        "Analysis took too long - try again later",
        408
      );
    }

    return ResponseApi.error(
      res,
      "Failed to analyze IP",
      process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error",
      500
    );
  }
};

/**
 * 🧮 CALCUL DU SCORE DE SÉCURITÉ
 */
function calculateSecurityScore(stats: any): number {
  let score = 100;

  // Pénalités basées sur les attaques
  score -= Math.min(stats.totalAttacks * 2, 50);
  score -= Math.min(stats.uniqueIPs * 1, 30);

  // Bonus pour l'absence d'attaques critiques
  const criticalAttacks = stats.topAttackTypes.filter(
    (t: any) => t.type === "SQL_INJECTION" || t.type === "XSS_ATTEMPT"
  ).length;

  if (criticalAttacks === 0) score += 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * 🚨 DÉTERMINATION DU NIVEAU DE MENACE
 */
function determineThreatLevel(
  stats: any
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (stats.totalAttacks === 0) return "LOW";
  if (stats.totalAttacks < 10) return "MEDIUM";
  if (stats.totalAttacks < 50) return "HIGH";
  return "CRITICAL";
}

/**
 * 💡 GÉNÉRATION DE RECOMMANDATIONS
 */
function generateSecurityRecommendations(stats: any): string[] {
  const recommendations = [];

  if (stats.totalAttacks > 0) {
    recommendations.push(
      "Surveiller les IPs suspectes et envisager un blocage temporaire"
    );
  }

  if (stats.uniqueIPs > 10) {
    recommendations.push(
      "Considérer l'activation de CAPTCHA pour les endpoints sensibles"
    );
  }

  const hasXSS = stats.topAttackTypes.some(
    (t: any) => t.type === "XSS_ATTEMPT"
  );
  if (hasXSS) {
    recommendations.push("Renforcer la validation des entrées utilisateur");
  }

  const hasSQL = stats.topAttackTypes.some(
    (t: any) => t.type === "SQL_INJECTION"
  );
  if (hasSQL) {
    recommendations.push("Vérifier toutes les requêtes de base de données");
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Niveau de sécurité satisfaisant - maintenir la vigilance"
    );
  }

  return recommendations;
}

/**
 * 🎯 DÉTERMINATION DE LA SÉVÉRITÉ
 */
function determineSeverityFromType(
  eventType: string
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  switch (eventType) {
    case "SQL_INJECTION":
      return "CRITICAL";
    case "XSS_ATTEMPT":
    case "NOSQL_INJECTION":
      return "HIGH";
    case "RATE_LIMIT_EXCEEDED":
    case "PARAMETER_POLLUTION":
      return "MEDIUM";
    default:
      return "LOW";
  }
}

/**
 * 🎯 CALCUL DU SCORE DE RISQUE IP
 */
function calculateIPRiskScore(analysis: any): number {
  let score = 0;

  // Plus de requêtes = plus de risque
  score += Math.min(analysis.totalRequests * 0.1, 30);

  // Événements de sécurité = risque élevé
  score += analysis.securityEvents * 5;

  // Multiples user agents = suspect
  if (analysis.uniqueUserAgents > 5) score += 20;

  // Multiples utilisateurs = suspect
  if (analysis.users.length > 3) score += 15;

  return Math.min(100, score);
}

/**
 * 💭 RECOMMANDATION BASÉE SUR LE RISQUE
 */
function getRiskRecommendation(riskScore: number): string {
  if (riskScore < 20) return "IP normale - pas d'action requise";
  if (riskScore < 50) return "IP suspecte - surveiller de près";
  if (riskScore < 80) return "IP à risque - envisager des restrictions";
  return "IP dangereuse - blocage recommandé";
}

export default {
  getSecurityStatistics,
  getRecentSecurityEvents,
  analyzeIP,
};
