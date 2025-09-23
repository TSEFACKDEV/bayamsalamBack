import { Request, Response, NextFunction } from "express";
import {
  sanitizeSearchParam,
  sanitizeXSS,
  sanitizeNumericParam,
} from "../utils/sanitization.utils.js";
import {
  detectAttackPattern,
  logSecurityEvent,
  SecurityEventType,
} from "../utils/securityMonitor.js";

/**
 * 🔒 VALIDATION STRICTE DES PARAMÈTRES
 *
 * Middleware qui valide et sanitise automatiquement tous les paramètres
 * sans casser la compatibilité frontend existante
 */

interface SanitizationLog {
  field: string;
  original: string;
  sanitized: string;
}

interface ValidationRules {
  search?: boolean;
  page?: boolean;
  limit?: boolean;
  categoryId?: boolean;
  cityId?: boolean;
}

export const strictValidator = (rules: ValidationRules = {}) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sanitizationLog: SanitizationLog[] = [];

      // 📝 VALIDATION DES QUERY PARAMETERS

      // Search parameter
      if (req.query.search !== undefined && rules.search) {
        const original = String(req.query.search);

        // 🔍 DÉTECTION AVANCÉE D'ATTAQUE
        const attackDetection = detectAttackPattern(original);
        if (attackDetection.detected) {
          await logSecurityEvent(
            {
              type: attackDetection.type,
              severity: attackDetection.severity,
              details: {
                original,
                sanitized: "",
                pattern: attackDetection.pattern,
                reason: "Attack pattern detected in search parameter",
              },
              blocked: false,
            },
            req
          );
        }

        const sanitized = sanitizeSearchParam(original);

        if (original !== sanitized) {
          sanitizationLog.push({ field: "search", original, sanitized });

          // 🚨 LOG DE SÉCURITÉ POUR CHANGEMENTS
          await logSecurityEvent(
            {
              type: SecurityEventType.PARAMETER_POLLUTION,
              severity: "MEDIUM",
              details: {
                original,
                sanitized,
                reason: "Search parameter sanitized",
              },
              blocked: false,
            },
            req
          );

          req.query.search = sanitized;
        }
      }

      // Page parameter
      if (req.query.page !== undefined && rules.page) {
        const original = String(req.query.page);
        const sanitized = String(
          sanitizeNumericParam(req.query.page, 1, 1, 1000)
        );

        if (original !== sanitized) {
          sanitizationLog.push({ field: "page", original, sanitized });
          req.query.page = sanitized;
        }
      }

      // Limit parameter
      if (req.query.limit !== undefined && rules.limit) {
        const original = String(req.query.limit);
        const sanitized = String(
          sanitizeNumericParam(req.query.limit, 10, 1, 100)
        );

        if (original !== sanitized) {
          sanitizationLog.push({ field: "limit", original, sanitized });
          req.query.limit = sanitized;
        }
      }

      // CategoryId parameter
      if (req.query.categoryId !== undefined && rules.categoryId) {
        const original = String(req.query.categoryId);
        const sanitized = String(
          sanitizeNumericParam(req.query.categoryId, 0, 1, 999999)
        );

        if (original !== sanitized) {
          sanitizationLog.push({ field: "categoryId", original, sanitized });
          req.query.categoryId = sanitized;
        }
      }

      // CityId parameter
      if (req.query.cityId !== undefined && rules.cityId) {
        const original = String(req.query.cityId);
        const sanitized = String(
          sanitizeNumericParam(req.query.cityId, 0, 1, 999999)
        );

        if (original !== sanitized) {
          sanitizationLog.push({ field: "cityId", original, sanitized });
          req.query.cityId = sanitized;
        }
      }

      // 🚨 LOGGING DE SÉCURITÉ UNIFIÉ
      if (sanitizationLog.length > 0) {
        // 🔥 LOG AVANCÉ UNIFIÉ (remplace les deux anciens logs)
        await logSecurityEvent(
          {
            type: SecurityEventType.PARAMETER_POLLUTION,
            severity: "MEDIUM",
            details: {
              original: JSON.stringify(sanitizationLog),
              sanitized: `${sanitizationLog.length} fields processed`,
              reason: "Multiple parameters required sanitization",
            },
            blocked: false,
          },
          req
        );

        // 🎯 Ajouter les logs à la réponse en mode développement
        if (process.env.NODE_ENV === "development") {
          res.locals.sanitizationLog = sanitizationLog;
        }
      }

      next();
    } catch (error) {
      console.error("🚨 [STRICT_VALIDATOR] Erreur:", error);
      next(error);
    }
  };
};

/**
 * 🔒 VALIDATION ULTRA-STRICTE POUR RECHERCHE
 *
 * Bloque les requêtes suspectes sans les laisser passer
 */
export const ultraStrictValidator = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const search = String(req.query.search || "");

      // 🔍 DÉTECTION STRICTE
      const attackDetection = detectAttackPattern(search);

      if (attackDetection.detected && attackDetection.severity === "HIGH") {
        await logSecurityEvent(
          {
            type: attackDetection.type,
            severity: "HIGH",
            details: {
              original: search,
              sanitized: "",
              pattern: attackDetection.pattern,
              reason: "High-risk attack pattern blocked",
            },
            blocked: true,
          },
          req
        );

        return res.status(400).json({
          status: 400,
          message: "Paramètre de recherche invalide",
          code: "INVALID_SEARCH_PARAM",
        }) as any;
      }

      next();
    } catch (error) {
      console.error("🚨 [ULTRA_STRICT_VALIDATOR] Erreur:", error);
      next(error);
    }
  };
};

// Aliases pour la compatibilité avec le code existant
export const readValidator = strictValidator({
  search: true,
  page: true,
  limit: true,
  categoryId: true,
  cityId: true,
});
export const createValidator = strictValidator({ search: true });
export const updateValidator = strictValidator({ search: true });

export default {
  strictValidator,
  ultraStrictValidator,
  readValidator,
  createValidator,
  updateValidator,
};
