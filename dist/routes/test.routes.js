"use strict";
/**
 * 🧪 ROUTES DE TEST - Migration Cookies httpOnly
 *
 * Endpoints de test pour valider la migration JWT vers cookies httpOnly
 * Ces routes permettent de tester les deux systèmes d'authentification:
 * - Ancien: localStorage + headers Authorization
 * - Nouveau: cookies httpOnly
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
const express_1 = require("express");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const response_js_1 = __importDefault(require("../helper/response.js"));
const router = (0, express_1.Router)();
/**
 * 🔍 TEST - Statut d'authentification
 *
 * Endpoint pour vérifier quel système d'auth est utilisé
 * et valider que les deux fonctionnent
 */
router.get('/auth-status', auth_middleware_js_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        // Vérifier la source du token
        const authHeader = req.header('Authorization');
        const headerToken = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))
            ? authHeader.substring(7)
            : authHeader;
        const cookieToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
        const authMethod = {
            hasHeaderToken: !!headerToken,
            hasCookieToken: !!cookieToken,
            activeMethod: cookieToken ? 'cookie' : 'header',
            priority: 'Cookie httpOnly (sécurisé) > Header Bearer (legacy)'
        };
        return response_js_1.default.success(res, 'Test d\'authentification réussi', {
            user: {
                id: (_b = req.authUser) === null || _b === void 0 ? void 0 : _b.id,
                email: (_c = req.authUser) === null || _c === void 0 ? void 0 : _c.email,
                firstName: (_d = req.authUser) === null || _d === void 0 ? void 0 : _d.firstName,
                lastName: (_e = req.authUser) === null || _e === void 0 ? void 0 : _e.lastName,
                status: (_f = req.authUser) === null || _f === void 0 ? void 0 : _f.status
            },
            authentication: authMethod,
            security: {
                cookieHttpOnly: !!cookieToken,
                secureFlag: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            }
        }, 200);
    }
    catch (error) {
        console.error('❌ [Test] Erreur test auth:', error);
        return response_js_1.default.error(res, 'Erreur lors du test d\'authentification', { error: (error === null || error === void 0 ? void 0 : error.message) || 'Erreur inconnue' }, 500);
    }
}));
/**
 * 🍪 TEST - Validation cookies
 *
 * Endpoint pour tester spécifiquement les cookies httpOnly
 */
router.get('/cookie-test', (req, res) => {
    try {
        const cookies = req.cookies;
        const hasAccessToken = !!(cookies === null || cookies === void 0 ? void 0 : cookies.accessToken);
        const hasRefreshToken = !!(cookies === null || cookies === void 0 ? void 0 : cookies.refreshToken);
        return response_js_1.default.success(res, 'Test des cookies réussi', {
            cookiesPresent: {
                accessToken: hasAccessToken,
                refreshToken: hasRefreshToken,
                total: Object.keys(cookies || {}).length
            },
            cookieNames: Object.keys(cookies || {}),
            security: {
                httpOnly: 'Configuré dans auth.controller.ts',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            }
        }, 200);
    }
    catch (error) {
        console.error('❌ [Test] Erreur test cookies:', error);
        return response_js_1.default.error(res, 'Erreur lors du test des cookies', { error: (error === null || error === void 0 ? void 0 : error.message) || 'Erreur inconnue' }, 500);
    }
});
/**
 * 🔄 TEST - Compatibilité duale
 *
 * Endpoint pour tester que les deux méthodes fonctionnent simultanément
 */
router.get('/dual-auth-test', (req, res) => {
    var _a;
    try {
        // Extraction manuelle comme dans auth.middleware.ts
        const authHeader = req.header('Authorization');
        const headerToken = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))
            ? authHeader.substring(7)
            : authHeader;
        const cookieToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
        const compatibilityTest = {
            headerMethod: {
                present: !!headerToken,
                format: (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) ? 'Bearer Token' : 'Direct Token',
                value: headerToken ? `${headerToken.substring(0, 20)}...` : null
            },
            cookieMethod: {
                present: !!cookieToken,
                httpOnly: true,
                value: cookieToken ? `${cookieToken.substring(0, 20)}...` : null
            },
            compatibility: {
                bothPresent: !!(headerToken && cookieToken),
                priority: cookieToken ? 'Cookie utilisé (priorité)' : 'Header utilisé (fallback)',
                migration: cookieToken ? 'Migration réussie' : 'En cours de migration'
            }
        };
        return response_js_1.default.success(res, 'Test de compatibilité duale réussi', compatibilityTest, 200);
    }
    catch (error) {
        console.error('❌ [Test] Erreur test dual auth:', error);
        return response_js_1.default.error(res, 'Erreur lors du test de compatibilité duale', { error: (error === null || error === void 0 ? void 0 : error.message) || 'Erreur inconnue' }, 500);
    }
});
exports.default = router;
