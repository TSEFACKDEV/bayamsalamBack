"use strict";
/**
 * CSRF Routes
 *
 * Endpoints for CSRF token management.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const csrf_middleware_js_1 = require("../middlewares/csrf.middleware.js");
const router = express_1.default.Router();
router.get("/token", (req, res) => {
    try {
        let csrfToken = csrf_middleware_js_1.CSRFUtils.getTokenFromRequest(req);
        if (!csrfToken) {
            csrfToken = (0, csrf_middleware_js_1.generateCSRFToken)();
            res.cookie(csrf_middleware_js_1.CSRFUtils.config.cookieName, csrfToken, csrf_middleware_js_1.CSRFUtils.config.cookieOptions);
            console.log(`[CSRF] New token generated for IP: ${req.ip}`);
        }
        else {
            console.log(`[CSRF] Existing token returned for IP: ${req.ip}`);
        }
        return response_js_1.default.success(res, "Token CSRF généré avec succès", {
            csrfToken,
            usage: {
                header: {
                    name: csrf_middleware_js_1.CSRFUtils.config.headerName,
                    example: `${csrf_middleware_js_1.CSRFUtils.config.headerName}: ${csrfToken}`,
                },
                body: {
                    field: csrf_middleware_js_1.CSRFUtils.config.tokenName,
                    example: `{ "${csrf_middleware_js_1.CSRFUtils.config.tokenName}": "${csrfToken}" }`,
                },
                cookie: {
                    name: csrf_middleware_js_1.CSRFUtils.config.cookieName,
                    info: "Cookie automatiquement géré par le navigateur",
                },
            },
            protection: {
                methods: ["POST", "PUT", "PATCH", "DELETE"],
                exemptedRoutes: csrf_middleware_js_1.CSRFUtils.config.exemptedRoutes,
                validity: "1 heure",
            },
        }, 200);
    }
    catch (error) {
        console.error("[CSRF] Token generation error:", error.message);
        return response_js_1.default.error(res, "Erreur lors de la génération du token CSRF", {
            code: "CSRF_GENERATION_ERROR",
            hint: "Réessayez dans quelques instants",
        }, 500);
    }
});
router.get("/status", (req, res) => {
    try {
        const hasToken = !!csrf_middleware_js_1.CSRFUtils.getTokenFromRequest(req);
        const userAgent = req.header("User-Agent");
        const sessionId = req.sessionID;
        return response_js_1.default.success(res, "Statut de protection CSRF", {
            csrf: {
                enabled: true,
                hasToken,
                tokenExists: hasToken
                    ? "✅ Token CSRF présent"
                    : "❌ Aucun token CSRF",
                pattern: "Double Submit Cookie",
            },
            session: {
                id: (sessionId === null || sessionId === void 0 ? void 0 : sessionId.substring(0, 8)) + "...",
                active: !!sessionId,
            },
            configuration: {
                cookieName: csrf_middleware_js_1.CSRFUtils.config.cookieName,
                headerName: csrf_middleware_js_1.CSRFUtils.config.headerName,
                protectedMethods: ["POST", "PUT", "PATCH", "DELETE"],
                exemptedRoutes: csrf_middleware_js_1.CSRFUtils.config.exemptedRoutes.length,
                cookieOptions: {
                    httpOnly: csrf_middleware_js_1.CSRFUtils.config.cookieOptions.httpOnly,
                    secure: csrf_middleware_js_1.CSRFUtils.config.cookieOptions.secure,
                    sameSite: csrf_middleware_js_1.CSRFUtils.config.cookieOptions.sameSite,
                },
            },
            client: {
                ip: req.ip,
                userAgent: (userAgent === null || userAgent === void 0 ? void 0 : userAgent.substring(0, 50)) + "..." || "Unknown",
                timestamp: new Date().toISOString(),
            },
            actions: {
                getToken: "GET /api/bayamsalam/csrf/token",
                includeInRequests: `Header: ${csrf_middleware_js_1.CSRFUtils.config.headerName} ou Body: ${csrf_middleware_js_1.CSRFUtils.config.tokenName}`,
            },
        }, 200);
    }
    catch (error) {
        console.error("[CSRF] Status check error:", error.message);
        return response_js_1.default.error(res, "Erreur lors de la vérification du statut CSRF", { code: "CSRF_STATUS_ERROR" }, 500);
    }
});
if (process.env.NODE_ENV === "development") {
    router.post("/test", (req, res) => {
        var _a;
        return response_js_1.default.success(res, "Test CSRF réussi", {
            message: "La protection CSRF fonctionne correctement",
            receivedToken: req.header(csrf_middleware_js_1.CSRFUtils.config.headerName) ||
                ((_a = req.body) === null || _a === void 0 ? void 0 : _a[csrf_middleware_js_1.CSRFUtils.config.tokenName]),
            timestamp: new Date().toISOString(),
        }, 200);
    });
}
exports.default = router;
