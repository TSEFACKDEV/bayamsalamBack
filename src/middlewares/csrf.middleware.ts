/**
 * CSRF Protection Middleware
 *
 * Double Submit Cookie pattern implementation for CSRF protection.
 * Compatible with existing JWT + Sessions architecture.
 */

import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import ResponseApi from "../helper/response.js";

const CSRF_CONFIG = {
  tokenName: "csrf-token",
  cookieName: "_csrf",
  headerName: "x-csrf-token",
  tokenLength: 32,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 3600000, // 1 hour
  },
  exemptedRoutes: [
    "/api/bayamsalam/auth/login",
    "/api/bayamsalam/auth/register",
    "/api/bayamsalam/auth/verify-otp",
    "/api/bayamsalam/auth/forgot-password",
    "/api/bayamsalam/auth/reset-password",
    "/api/bayamsalam/auth/refresh-token",
    "/api/bayamsalam/auth/google",
    "/api/bayamsalam/auth/google/callback",
    "/api/bayamsalam/csrf/token",
  ],
  exemptedMethods: ["GET", "HEAD", "OPTIONS"],
};

export const generateCSRFToken = (): string => {
  return crypto.randomBytes(CSRF_CONFIG.tokenLength).toString("hex");
};

export const generateCSRFMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    let csrfToken = req.cookies[CSRF_CONFIG.cookieName];

    if (!csrfToken) {
      csrfToken = generateCSRFToken();
      res.cookie(CSRF_CONFIG.cookieName, csrfToken, CSRF_CONFIG.cookieOptions);
      console.log(
        `[CSRF] New token generated for session: ${req.sessionID?.substring(
          0,
          8
        )}...`
      );
    }

    res.locals.csrfToken = csrfToken;
    next();
  } catch (error) {
    console.error("[CSRF] Token generation error:", error);
    next();
  }
};

export const validateCSRFMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  try {
    // Skip read-only methods
    if (CSRF_CONFIG.exemptedMethods.includes(req.method)) {
      return next();
    }

    // Skip exempted routes
    const requestPath = req.originalUrl || req.url;
    const isExemptedRoute = CSRF_CONFIG.exemptedRoutes.some((route) =>
      requestPath.startsWith(route)
    );

    if (isExemptedRoute) {
      console.log(`[CSRF] Exempted route: ${requestPath}`);
      return next();
    }

    // Get cookie token
    const cookieToken = req.cookies[CSRF_CONFIG.cookieName];

    if (!cookieToken) {
      return ResponseApi.error(
        res,
        "Token CSRF manquant - Cookie requis",
        {
          code: "CSRF_COOKIE_MISSING",
          hint: "Obtenez un token CSRF via GET /api/bayamsalam/csrf/token",
        },
        403
      );
    }

    // Get submitted token from header or body
    const headerToken =
      req.header(CSRF_CONFIG.headerName) || req.header(CSRF_CONFIG.tokenName);
    const bodyToken = req.body?.[CSRF_CONFIG.tokenName];
    const submittedToken = headerToken || bodyToken;

    if (!submittedToken) {
      return ResponseApi.error(
        res,
        "Token CSRF manquant - Header ou body requis",
        {
          code: "CSRF_TOKEN_MISSING",
          expectedHeader: CSRF_CONFIG.headerName,
          expectedBody: CSRF_CONFIG.tokenName,
          hint: "Incluez le token CSRF dans l'en-tête X-CSRF-Token ou dans le body",
        },
        403
      );
    }

    // Secure token comparison
    const isValidToken = crypto.timingSafeEqual(
      Buffer.from(cookieToken, "hex"),
      Buffer.from(submittedToken, "hex")
    );

    if (!isValidToken) {
      return ResponseApi.error(
        res,
        "Token CSRF invalide",
        {
          code: "CSRF_TOKEN_INVALID",
          hint: "Le token CSRF ne correspond pas au cookie de session",
        },
        403
      );
    }

    console.log(`[CSRF] Token validated for ${req.method} ${requestPath}`);
    next();
  } catch (error: any) {
    console.error("[CSRF] Validation error:", error.message);

    return ResponseApi.error(
      res,
      "Erreur de validation CSRF",
      { code: "CSRF_VALIDATION_ERROR" },
      403
    );
  }
};

export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  generateCSRFMiddleware(req, res, (err) => {
    if (err) return next(err);
    validateCSRFMiddleware(req, res, next);
  });
};

export const CSRFUtils = {
  getTokenFromResponse: (res: Response): string | undefined => {
    return res.locals.csrfToken;
  },

  getTokenFromRequest: (req: Request): string | undefined => {
    return req.cookies[CSRF_CONFIG.cookieName];
  },

  config: CSRF_CONFIG,
};

export default {
  generateCSRFMiddleware,
  validateCSRFMiddleware,
  csrfProtection,
  generateCSRFToken,
  CSRFUtils,
};
