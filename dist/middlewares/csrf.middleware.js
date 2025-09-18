"use strict";
/**
 * CSRF Protection Middleware
 *
 * Double Submit Cookie pattern implementation for CSRF protection.
 * Compatible with existing JWT + Sessions architecture.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSRFUtils = exports.csrfProtection = exports.validateCSRFMiddleware = exports.generateCSRFMiddleware = exports.generateCSRFToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const CSRF_CONFIG = {
    tokenName: "csrf-token",
    cookieName: "_csrf",
    headerName: "x-csrf-token",
    tokenLength: 32,
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
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
const generateCSRFToken = () => {
    return crypto_1.default.randomBytes(CSRF_CONFIG.tokenLength).toString("hex");
};
exports.generateCSRFToken = generateCSRFToken;
const generateCSRFMiddleware = (req, res, next) => {
    var _a;
    try {
        let csrfToken = req.cookies[CSRF_CONFIG.cookieName];
        if (!csrfToken) {
            csrfToken = (0, exports.generateCSRFToken)();
            res.cookie(CSRF_CONFIG.cookieName, csrfToken, CSRF_CONFIG.cookieOptions);
            console.log(`[CSRF] New token generated for session: ${(_a = req.sessionID) === null || _a === void 0 ? void 0 : _a.substring(0, 8)}...`);
        }
        res.locals.csrfToken = csrfToken;
        next();
    }
    catch (error) {
        console.error("[CSRF] Token generation error:", error);
        next();
    }
};
exports.generateCSRFMiddleware = generateCSRFMiddleware;
const validateCSRFMiddleware = (req, res, next) => {
    var _a;
    try {
        // Skip read-only methods
        if (CSRF_CONFIG.exemptedMethods.includes(req.method)) {
            return next();
        }
        // Skip exempted routes
        const requestPath = req.originalUrl || req.url;
        const isExemptedRoute = CSRF_CONFIG.exemptedRoutes.some((route) => requestPath.startsWith(route));
        if (isExemptedRoute) {
            console.log(`[CSRF] Exempted route: ${requestPath}`);
            return next();
        }
        // Get cookie token
        const cookieToken = req.cookies[CSRF_CONFIG.cookieName];
        if (!cookieToken) {
            return response_js_1.default.error(res, "Token CSRF manquant - Cookie requis", {
                code: "CSRF_COOKIE_MISSING",
                hint: "Obtenez un token CSRF via GET /api/bayamsalam/csrf/token",
            }, 403);
        }
        // Get submitted token from header or body
        const headerToken = req.header(CSRF_CONFIG.headerName) || req.header(CSRF_CONFIG.tokenName);
        const bodyToken = (_a = req.body) === null || _a === void 0 ? void 0 : _a[CSRF_CONFIG.tokenName];
        const submittedToken = headerToken || bodyToken;
        if (!submittedToken) {
            return response_js_1.default.error(res, "Token CSRF manquant - Header ou body requis", {
                code: "CSRF_TOKEN_MISSING",
                expectedHeader: CSRF_CONFIG.headerName,
                expectedBody: CSRF_CONFIG.tokenName,
                hint: "Incluez le token CSRF dans l'en-tête X-CSRF-Token ou dans le body",
            }, 403);
        }
        // Secure token comparison
        const isValidToken = crypto_1.default.timingSafeEqual(Buffer.from(cookieToken, "hex"), Buffer.from(submittedToken, "hex"));
        if (!isValidToken) {
            return response_js_1.default.error(res, "Token CSRF invalide", {
                code: "CSRF_TOKEN_INVALID",
                hint: "Le token CSRF ne correspond pas au cookie de session",
            }, 403);
        }
        console.log(`[CSRF] Token validated for ${req.method} ${requestPath}`);
        next();
    }
    catch (error) {
        console.error("[CSRF] Validation error:", error.message);
        return response_js_1.default.error(res, "Erreur de validation CSRF", { code: "CSRF_VALIDATION_ERROR" }, 403);
    }
};
exports.validateCSRFMiddleware = validateCSRFMiddleware;
const csrfProtection = (req, res, next) => {
    (0, exports.generateCSRFMiddleware)(req, res, (err) => {
        if (err)
            return next(err);
        (0, exports.validateCSRFMiddleware)(req, res, next);
    });
};
exports.csrfProtection = csrfProtection;
exports.CSRFUtils = {
    getTokenFromResponse: (res) => {
        return res.locals.csrfToken;
    },
    getTokenFromRequest: (req) => {
        return req.cookies[CSRF_CONFIG.cookieName];
    },
    config: CSRF_CONFIG,
};
exports.default = {
    generateCSRFMiddleware: exports.generateCSRFMiddleware,
    validateCSRFMiddleware: exports.validateCSRFMiddleware,
    csrfProtection: exports.csrfProtection,
    generateCSRFToken: exports.generateCSRFToken,
    CSRFUtils: exports.CSRFUtils,
};
