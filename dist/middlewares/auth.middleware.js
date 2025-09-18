"use strict";
/**
 * 🔐 MIDDLEWARES D'AUTHENTIFICATION ET D'AUTORISATION - BuyAndSale
 *
 * Ce module contient les middlewares de sécurité pour:
 * - Vérification de l'authentification (JWT access tokens)
 * - Vérification des autorisations (rôles SUPER_ADMIN)
 *
 * 🎯 STRATÉGIE DE SÉCURITÉ:
 * - Validation stricte des tokens JWT
 * - Gestion détaillée des erreurs (token expiré, invalide, etc.)
 * - Vérification des rôles basée sur la base de données (sécurité renforcée)
 * - Support des formats Bearer token flexible
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
exports.isAdmin = exports.authenticate = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_js_1 = __importDefault(require("../config/config.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
/**
 * 🔑 MIDDLEWARE D'AUTHENTIFICATION
 *
 * Vérifie la validité du token JWT et attache l'utilisateur à la requête.
 * Compatible avec les tokens envoyés via header Authorization.
 *
 * @param req - Requête Express
 * @param res - Réponse Express
 * @param next - Fonction next pour continuer le pipeline
 */
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 📡 EXTRACTION DU TOKEN DEPUIS L'EN-TÊTE AUTHORIZATION
        const authHeader = req.header("Authorization");
        const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))
            ? authHeader.substring(7) // Format: "Bearer <token>"
            : authHeader; // Format direct: "<token>"
        if (!token) {
            return response_js_1.default.error(res, "Token d'authentification requis", {
                code: "NO_TOKEN",
            }, 401);
        }
        // 🔓 DÉCODAGE ET VALIDATION DU TOKEN JWT
        const decoded = jsonwebtoken_1.default.verify(token, config_js_1.default.jwtSecret);
        // 👤 RÉCUPÉRATION DES DONNÉES UTILISATEUR
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            return response_js_1.default.error(res, "Utilisateur non trouvé", {
                code: "USER_NOT_FOUND",
            }, 404);
        }
        if (!user.isVerified) {
            return response_js_1.default.error(res, "Compte non vérifié", {
                code: "ACCOUNT_NOT_VERIFIED",
            }, 403);
        }
        if (user.status !== "ACTIVE") {
            return response_js_1.default.error(res, "Compte suspendu ou inactif", {
                code: "ACCOUNT_INACTIVE",
                status: user.status,
            }, 403);
        }
        // ✅ AUTHENTIFICATION RÉUSSIE
        req.authUser = user;
        next();
    }
    catch (error) {
        console.error("❌ [Auth] Erreur d'authentification:", error.message);
        // � GESTION DÉTAILLÉE DES ERREURS JWT
        if (error.name === "TokenExpiredError") {
            return response_js_1.default.error(res, "Token expiré", {
                code: "TOKEN_EXPIRED",
                expiredAt: error.expiredAt,
                hint: "Utilisez le refresh token pour obtenir un nouveau token d'accès",
            }, 401);
        }
        if (error.name === "JsonWebTokenError") {
            return response_js_1.default.error(res, "Token malformé ou invalide", {
                code: "TOKEN_INVALID",
            }, 401);
        }
        if (error.name === "NotBeforeError") {
            return response_js_1.default.error(res, "Token pas encore actif", {
                code: "TOKEN_NOT_ACTIVE",
            }, 401);
        }
        // 🚨 ERREUR D'AUTHENTIFICATION GÉNÉRIQUE
        return response_js_1.default.error(res, "Échec de l'authentification", {
            code: "AUTH_ERROR",
        }, 401);
    }
});
exports.authenticate = authenticate;
/**
 * 🛡️ MIDDLEWARE D'AUTORISATION ADMIN
 *
 * Vérifie que l'utilisateur authentifié possède le rôle SUPER_ADMIN.
 * Ce middleware doit être utilisé après le middleware authenticate.
 *
 * 🔒 SÉCURITÉ RENFORCÉE:
 * - Vérification des rôles basée sur la base de données (pas sur le token)
 * - Protection contre les attaques de manipulation de tokens
 * - Validation complète de l'utilisateur et de ses permissions
 *
 * @param req - Requête Express
 * @param res - Réponse Express
 * @param next - Fonction next pour continuer le pipeline
 */
const isAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 📡 EXTRACTION DU TOKEN (même logique que authenticate)
        const authHeader = req.header("Authorization");
        const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))
            ? authHeader.substring(7)
            : authHeader;
        if (!token) {
            return response_js_1.default.error(res, "Token d'authentification requis", {
                code: "NO_TOKEN",
            }, 401);
        }
        // 🔓 DÉCODAGE DU TOKEN
        const decoded = jsonwebtoken_1.default.verify(token, config_js_1.default.jwtSecret);
        // 👤 RÉCUPÉRATION COMPLÈTE DE L'UTILISATEUR AVEC SES RÔLES
        const userWithRoles = yield prisma_client_js_1.default.user.findUnique({
            where: { id: decoded.id },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        if (!userWithRoles) {
            return response_js_1.default.error(res, "Utilisateur non trouvé", {
                code: "USER_NOT_FOUND",
            }, 404);
        }
        if (!userWithRoles.isVerified) {
            return response_js_1.default.error(res, "Compte non vérifié", {
                code: "ACCOUNT_NOT_VERIFIED",
            }, 403);
        }
        if (userWithRoles.status !== "ACTIVE") {
            return response_js_1.default.error(res, "Compte suspendu ou inactif", {
                code: "ACCOUNT_INACTIVE",
                status: userWithRoles.status,
            }, 403);
        }
        // 🔍 VÉRIFICATION DU RÔLE SUPER_ADMIN
        const hasAdminRole = userWithRoles.roles.some((userRole) => userRole.role.name === "SUPER_ADMIN");
        if (!hasAdminRole) {
            const userRoles = userWithRoles.roles.map((ur) => ur.role.name);
            return response_js_1.default.error(res, "Accès refusé : privilèges administrateur requis", {
                code: "INSUFFICIENT_PRIVILEGES",
                userRoles,
                requiredRole: "SUPER_ADMIN",
            }, 403);
        }
        // ✅ AUTORISATION ACCORDÉE
        req.authUser = userWithRoles;
        next();
    }
    catch (error) {
        console.error("❌ [Admin] Erreur d'autorisation:", error.message);
        // 🔍 GESTION DES ERREURS JWT (similaire à authenticate)
        if (error.name === "TokenExpiredError") {
            return response_js_1.default.error(res, "Token expiré", {
                code: "TOKEN_EXPIRED",
                expiredAt: error.expiredAt,
            }, 401);
        }
        if (error.name === "JsonWebTokenError") {
            return response_js_1.default.error(res, "Token malformé ou invalide", {
                code: "TOKEN_INVALID",
            }, 401);
        }
        return response_js_1.default.error(res, "Échec de la vérification des autorisations", {
            code: "AUTHORIZATION_ERROR",
        }, 401);
    }
});
exports.isAdmin = isAdmin;
