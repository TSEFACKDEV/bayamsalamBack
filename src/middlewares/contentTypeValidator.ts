/**
 * 🛡️ VALIDATION SIMPLE DES CONTENT-TYPE - BuyAndSale
 *
 * Middleware léger pour bloquer les Content-Type dangereux
 * tout en préservant la compatibilité avec le frontend existant.
 */

import { Request, Response, NextFunction } from "express";
import ResponseApi from "../helper/response.js";

/**
 * 🚫 CONTENT-TYPES DANGEREUX À BLOQUER ABSOLUMENT
 */
const DANGEROUS_CONTENT_TYPES = [
  "text/html",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/x-javascript",
  "application/x-shockwave-flash",
  "application/x-msdownload",
  "text/x-script",
  "text/scriptlet",
  "application/x-executable",
  "application/x-msdownload",
  "application/x-msdos-program",
];

/**
 * ✅ CONTENT-TYPES AUTORISÉS (basé sur l'analyse du frontend)
 * - application/json (APIs standards)
 * - multipart/form-data (uploads de fichiers/images)
 * - application/x-www-form-urlencoded (formulaires)
 */
const ALLOWED_CONTENT_TYPES = [
  "application/json",
  "multipart/form-data",
  "application/x-www-form-urlencoded",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

/**
 * 🛡️ MIDDLEWARE DE VALIDATION SIMPLE
 */
export function validateContentType() {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    // Skip pour les requêtes sans body
    if (["GET", "HEAD", "DELETE", "OPTIONS"].includes(req.method)) {
      return next();
    }

    const contentType = req.get("Content-Type") || "";
    const baseContentType = contentType.split(";")[0].trim().toLowerCase();

    // Si pas de Content-Type, on laisse passer (compatibilité)
    if (!contentType) {
      return next();
    }

    // 🚨 BLOQUER LES TYPES DANGEREUX
    if (
      DANGEROUS_CONTENT_TYPES.some((dangerous) =>
        baseContentType.includes(dangerous)
      )
    ) {
      console.warn(`🚫 Content-Type dangereux bloqué: ${baseContentType}`, {
        ip: req.ip,
        endpoint: req.path,
        userAgent: req.get("User-Agent"),
      });

      return ResponseApi.error(
        res,
        "Type de contenu non autorisé",
        {
          code: "INVALID_CONTENT_TYPE",
          message: "Ce type de contenu peut présenter un risque de sécurité",
        },
        415
      );
    }

    // ⚠️ ALERTER SUR LES TYPES INHABITUELS (mais laisser passer)
    const isKnownType = ALLOWED_CONTENT_TYPES.some(
      (allowed) =>
        baseContentType === allowed ||
        baseContentType.startsWith("multipart/form-data")
    );

    if (!isKnownType) {
      console.warn(`⚠️ Content-Type inhabituel détecté: ${baseContentType}`, {
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
      });
      // On alerte mais on laisse passer pour ne pas casser l'app
    }

    next();
  };
}

export default validateContentType;
