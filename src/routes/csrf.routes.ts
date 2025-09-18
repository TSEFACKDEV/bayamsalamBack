/**
 * CSRF Routes
 *
 * Endpoints for CSRF token management.
 */

import express from "express";
import ResponseApi from "../helper/response.js";
import {
  generateCSRFToken,
  CSRFUtils,
} from "../middlewares/csrf.middleware.js";

const router = express.Router();

router.get("/token", (req, res) => {
  try {
    let csrfToken = CSRFUtils.getTokenFromRequest(req);

    if (!csrfToken) {
      csrfToken = generateCSRFToken();
      res.cookie(
        CSRFUtils.config.cookieName,
        csrfToken,
        CSRFUtils.config.cookieOptions
      );
      console.log(`[CSRF] New token generated for IP: ${req.ip}`);
    } else {
      console.log(`[CSRF] Existing token returned for IP: ${req.ip}`);
    }

    return ResponseApi.success(
      res,
      "Token CSRF généré avec succès",
      {
        csrfToken,
        usage: {
          header: {
            name: CSRFUtils.config.headerName,
            example: `${CSRFUtils.config.headerName}: ${csrfToken}`,
          },
          body: {
            field: CSRFUtils.config.tokenName,
            example: `{ "${CSRFUtils.config.tokenName}": "${csrfToken}" }`,
          },
          cookie: {
            name: CSRFUtils.config.cookieName,
            info: "Cookie automatiquement géré par le navigateur",
          },
        },
        protection: {
          methods: ["POST", "PUT", "PATCH", "DELETE"],
          exemptedRoutes: CSRFUtils.config.exemptedRoutes,
          validity: "1 heure",
        },
      },
      200
    );
  } catch (error: any) {
    console.error("[CSRF] Token generation error:", error.message);

    return ResponseApi.error(
      res,
      "Erreur lors de la génération du token CSRF",
      {
        code: "CSRF_GENERATION_ERROR",
        hint: "Réessayez dans quelques instants",
      },
      500
    );
  }
});

router.get("/status", (req, res) => {
  try {
    const hasToken = !!CSRFUtils.getTokenFromRequest(req);
    const userAgent = req.header("User-Agent");
    const sessionId = req.sessionID;

    return ResponseApi.success(
      res,
      "Statut de protection CSRF",
      {
        csrf: {
          enabled: true,
          hasToken,
          tokenExists: hasToken
            ? "✅ Token CSRF présent"
            : "❌ Aucun token CSRF",
          pattern: "Double Submit Cookie",
        },
        session: {
          id: sessionId?.substring(0, 8) + "...",
          active: !!sessionId,
        },
        configuration: {
          cookieName: CSRFUtils.config.cookieName,
          headerName: CSRFUtils.config.headerName,
          protectedMethods: ["POST", "PUT", "PATCH", "DELETE"],
          exemptedRoutes: CSRFUtils.config.exemptedRoutes.length,
          cookieOptions: {
            httpOnly: CSRFUtils.config.cookieOptions.httpOnly,
            secure: CSRFUtils.config.cookieOptions.secure,
            sameSite: CSRFUtils.config.cookieOptions.sameSite,
          },
        },
        client: {
          ip: req.ip,
          userAgent: userAgent?.substring(0, 50) + "..." || "Unknown",
          timestamp: new Date().toISOString(),
        },
        actions: {
          getToken: "GET /api/bayamsalam/csrf/token",
          includeInRequests: `Header: ${CSRFUtils.config.headerName} ou Body: ${CSRFUtils.config.tokenName}`,
        },
      },
      200
    );
  } catch (error: any) {
    console.error("[CSRF] Status check error:", error.message);

    return ResponseApi.error(
      res,
      "Erreur lors de la vérification du statut CSRF",
      { code: "CSRF_STATUS_ERROR" },
      500
    );
  }
});

if (process.env.NODE_ENV === "development") {
  router.post("/test", (req, res) => {
    return ResponseApi.success(
      res,
      "Test CSRF réussi",
      {
        message: "La protection CSRF fonctionne correctement",
        receivedToken:
          req.header(CSRFUtils.config.headerName) ||
          req.body?.[CSRFUtils.config.tokenName],
        timestamp: new Date().toISOString(),
      },
      200
    );
  });
}

export default router;
