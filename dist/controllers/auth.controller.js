"use strict";
/**
 * 🔐 CONTRÔLEUR D'AUTHENTIFICATION - BuyAndSale
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCallback = exports.getUserProfile = exports.resetPassword = exports.forgotPassword = exports.logout = exports.refreshToken = exports.login = exports.resendOTP = exports.verifyOTP = exports.register = void 0;
const bcrypt_js_1 = require("../utilities/bcrypt.js");
const token_js_1 = require("../utilities/token.js");
const mailer_js_1 = require("../utilities/mailer.js");
const sms_js_1 = require("../utilities/sms.js");
const otp_js_1 = require("../utilities/otp.js");
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const config_js_1 = __importDefault(require("../config/config.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const utils_js_1 = __importDefault(require("../helper/utils.js"));
const otpEmailTemplate_js_1 = require("../templates/otpEmailTemplate.js");
const notification_service_js_1 = require("../services/notification.service.js");
const input_validation_js_1 = require("../utilities/input.validation.js");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 🔐 VALIDATION SÉCURISÉE DES DONNÉES
        const validation = (0, input_validation_js_1.validateAndNormalizeRegistration)(req.body);
        if (!validation.isValid) {
            return response_js_1.default.error(res, validation.message || "Données invalides", null, 400);
        }
        const { email, firstName, lastName, phone, password } = validation.normalizedData;
        const existingUser = yield prisma_client_js_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            // Permettre la réinscription si compte non vérifié
            if (!existingUser.isVerified) {
                // Supprimer l'ancien compte non vérifié et ses relations
                yield prisma_client_js_1.default.userRole.deleteMany({
                    where: { userId: existingUser.id },
                });
                yield prisma_client_js_1.default.user.delete({
                    where: { id: existingUser.id },
                });
                console.log(`Compte non vérifié supprimé pour réinscription: ${email}`);
            }
            else {
                // Compte déjà vérifié, impossible de se réinscrire
                return response_js_1.default.error(res, "Un utilisateur avec cet email existe déjà", null, 400);
            }
        }
        const hashedPassword = yield (0, bcrypt_js_1.hashPassword)(password);
        const newUser = yield prisma_client_js_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
            },
        });
        // Ajout automatique du rôle USER
        const userRole = yield prisma_client_js_1.default.role.findUnique({ where: { name: "USER" } });
        if (userRole) {
            yield prisma_client_js_1.default.userRole.create({
                data: {
                    userId: newUser.id,
                    roleId: userRole.id,
                },
            });
        }
        const otp = (0, otp_js_1.generateOTP)();
        const smsSent = yield (0, sms_js_1.sendSMS)(phone, `Votre code OTP est: ${otp}`);
        // Log OTP en développement pour faciliter les tests
        if (process.env.NODE_ENV === "development") {
            console.log(`OTP pour ${phone}: ${otp}`);
        }
        if (!smsSent) {
            // Plus besoin de logoUrl !
            const htmlTemplate = (0, otpEmailTemplate_js_1.createOTPEmailTemplate)(firstName, lastName, otp);
            yield (0, mailer_js_1.sendEmail)(email, "🔐 Code de vérification BuyAndSale - Bienvenue !", `Bonjour ${firstName} ${lastName},\n\nVotre code OTP est: ${otp}\n\nBienvenue sur BuyAndSale !`, htmlTemplate);
        }
        yield prisma_client_js_1.default.user.update({
            where: { id: newUser.id },
            data: {
                otp,
                otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes d'expiration
                otpAttempts: 1, // Premier envoi d'OTP
                otpLastAttempt: new Date(), // Timestamp du premier envoi
            },
        });
        return response_js_1.default.success(res, "Inscription réussie. Veuillez vérifier votre OTP.", {
            userId: newUser.id,
        }, 201);
    }
    catch (error) {
        console.error("Erreur lors de l'inscription:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de l'inscription", error.message, 500);
    }
});
exports.register = register;
const verifyOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { otp, userId } = req.body;
        if (!otp || !userId) {
            return response_js_1.default.error(res, "OTP et userId sont requis", null, 400);
        }
        const existingUser = yield prisma_client_js_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!existingUser) {
            return response_js_1.default.notFound(res, "Utilisateur non trouvé", 404);
        }
        if (existingUser.isVerified) {
            return response_js_1.default.error(res, "Le compte est déjà vérifié", null, 400);
        }
        // 🕒 VÉRIFICATION DE L'EXPIRATION DE L'OTP
        if (existingUser.otpExpires && existingUser.otpExpires < new Date()) {
            return response_js_1.default.error(res, "Code OTP expiré. Demandez un nouveau code via resend-otp", {
                code: "OTP_EXPIRED",
                expiredAt: existingUser.otpExpires,
                hint: "Utilisez l'endpoint /resend-otp pour obtenir un nouveau code",
            }, 400);
        }
        if (!(0, otp_js_1.validateOTP)(otp, existingUser.otp)) {
            return response_js_1.default.error(res, "OTP invalide", null, 400);
        }
        const user = yield prisma_client_js_1.default.user.update({
            where: { id: userId },
            data: {
                otp: null,
                otpExpires: null, // Nettoyer l'expiration aussi
                otpAttempts: 0, // Réinitialiser le compteur de tentatives
                otpLastAttempt: null, // Réinitialiser le timestamp
                isVerified: true,
                status: "ACTIVE",
            },
        });
        // Créer notification de bienvenue
        yield (0, notification_service_js_1.createNotification)(user.id, "Bienvenue sur BuyAndSale", "Votre compte a été vérifié avec succès. Bienvenue !", {
            type: "WELCOME",
            link: "/",
        });
        // Envoi du mail de bienvenue après vérification OTP
        try {
            // Import dynamique pour éviter les problèmes d'import circulaire
            const { createWelcomeTemplate } = yield Promise.resolve().then(() => __importStar(require("../templates/welComeTemplate.js")));
            const htmlTemplate = createWelcomeTemplate(user.firstName, user.lastName);
            yield (0, mailer_js_1.sendEmail)(user.email, "🎉 Bienvenue sur BuyAndSale !", `Bonjour ${user.firstName} ${user.lastName},\n\nVotre compte a été vérifié avec succès. Bienvenue sur BuyAndSale !`, htmlTemplate);
        }
        catch (mailError) {
            console.error("Erreur lors de l'envoi du mail de bienvenue:", mailError);
            // On ne bloque pas la réponse si le mail échoue
        }
        return response_js_1.default.success(res, "OTP vérifié avec succès", user, 200);
    }
    catch (error) {
        console.error("Erreur lors de la vérification OTP:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la vérification OTP", error.message, 500);
    }
});
exports.verifyOTP = verifyOTP;
const resendOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        if (!userId) {
            return response_js_1.default.error(res, "UserId est requis", null, 400);
        }
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return response_js_1.default.error(res, "Utilisateur non trouvé", null, 404);
        }
        if (user.isVerified) {
            return response_js_1.default.error(res, "Compte déjà vérifié", null, 400);
        }
        // �️ PROTECTION: Vérifier les tentatives de renvoi OTP (3 max par heure)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const shouldResetAttempts = !user.otpLastAttempt || user.otpLastAttempt < oneHourAgo;
        if (shouldResetAttempts) {
            // Réinitialiser le compteur si plus d'1 heure s'est écoulée
            yield prisma_client_js_1.default.user.update({
                where: { id: userId },
                data: {
                    otpAttempts: 0,
                    otpLastAttempt: new Date(),
                },
            });
        }
        else if (user.otpAttempts >= 3) {
            // Limite de 3 tentatives par heure atteinte
            const timeLeft = Math.ceil((user.otpLastAttempt.getTime() + 60 * 60 * 1000 - Date.now()) /
                1000 /
                60);
            return response_js_1.default.error(res, `Limite de tentatives atteinte (3 max par heure). Réessayez dans ${timeLeft} minutes`, {
                code: "OTP_ATTEMPT_LIMIT_EXCEEDED",
                attemptsUsed: user.otpAttempts,
                maxAttempts: 3,
                resetInMinutes: timeLeft,
                nextAttemptAt: new Date(user.otpLastAttempt.getTime() + 60 * 60 * 1000),
            }, 429);
        }
        // �🔐 SÉCURITÉ: Vérifier si un OTP a été récemment envoyé (limite 1 minute)
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        if (user.updatedAt && user.updatedAt > oneMinuteAgo) {
            return response_js_1.default.error(res, "Veuillez attendre 1 minute avant de demander un nouveau code", null, 429);
        }
        // 🔢 GÉNÉRATION D'UN NOUVEAU CODE OTP
        const otp = (0, otp_js_1.generateOTP)();
        // 📱 ENVOI PAR SMS EN PRIORITÉ
        const smsSent = yield (0, sms_js_1.sendSMS)(user.phone, `Votre nouveau code OTP est: ${otp}`);
        // Log OTP en développement pour faciliter les tests
        if (process.env.NODE_ENV === "development") {
            console.log(`🔄 Nouveau OTP pour ${user.phone}: ${otp}`);
        }
        // 📧 FALLBACK EMAIL SI SMS ÉCHOUE
        if (!smsSent && user.email) {
            const htmlTemplate = (0, otpEmailTemplate_js_1.createOTPEmailTemplate)(user.firstName, user.lastName, otp);
            yield (0, mailer_js_1.sendEmail)(user.email, "🔄 Nouveau code de vérification BuyAndSale", `Bonjour ${user.firstName} ${user.lastName},\n\nVotre nouveau code OTP est: ${otp}\n\nCe code remplace le précédent.`, htmlTemplate);
        }
        // 💾 MISE À JOUR EN BASE DE DONNÉES
        yield prisma_client_js_1.default.user.update({
            where: { id: userId },
            data: {
                otp,
                otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes d'expiration
                otpAttempts: shouldResetAttempts ? 1 : (user.otpAttempts || 0) + 1, // Incrémenter ou réinitialiser
                otpLastAttempt: new Date(), // Mettre à jour le timestamp de la dernière tentative
                updatedAt: new Date(), // Important pour le rate limiting
            },
        });
        // 📊 LOG POUR MONITORING
        console.log(`✅ [ResendOTP] Nouveau code envoyé pour utilisateur ${userId}:`, {
            phone: user.phone,
            email: user.email,
            method: smsSent ? "SMS" : "EMAIL",
            timestamp: new Date().toISOString(),
        });
        return response_js_1.default.success(res, smsSent
            ? "Nouveau code OTP envoyé par SMS"
            : "Nouveau code OTP envoyé par email", {
            userId: user.id,
            method: smsSent ? "SMS" : "EMAIL",
        }, 200);
    }
    catch (error) {
        console.error("❌ Erreur lors du renvoi OTP:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors du renvoi de l'OTP", error.message, 500);
    }
});
exports.resendOTP = resendOTP;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 🔐 VALIDATION SÉCURISÉE DES DONNÉES DE CONNEXION
        const validation = (0, input_validation_js_1.validateLoginData)(req.body);
        if (!validation.isValid) {
            return response_js_1.default.error(res, validation.message || "Données de connexion invalides", null, 400);
        }
        const { identifiant, password } = req.body;
        if (!identifiant || !password) {
            return response_js_1.default.error(res, "Identifiant et mot de passe sont requis", null, 400);
        }
        const user = yield prisma_client_js_1.default.user.findFirst({
            where: {
                OR: [{ email: identifiant }, { phone: identifiant }],
            },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            return response_js_1.default.error(res, "Identifiant ou mot de passe incorrect", null, 401);
        }
        if (!user.isVerified) {
            return response_js_1.default.error(res, "Compte non vérifié. Veuillez vérifier votre email.", null, 403);
        }
        const isPasswordValid = yield (0, bcrypt_js_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return response_js_1.default.error(res, " Identifiant ou mot de passe incorrect", null, 401);
        }
        // 🔐 GÉNÉRATION DES TOKENS D'AUTHENTIFICATION
        const AccessToken = (0, token_js_1.generateToken)({
            id: user.id,
            email: user.email,
        });
        const refreshToken = (0, token_js_1.generateRefreshToken)({
            id: user.id,
            email: user.email,
        });
        // 🎯 GESTION MULTI-DEVICE POUR LOGIN NORMAL
        // Stratégie: Préserver les sessions existantes, créer une nouvelle seulement si nécessaire
        const shouldCreateNewSession = !user.refreshToken;
        if (shouldCreateNewSession) {
            // Première connexion ou pas de session active → créer une nouvelle session
            yield prisma_client_js_1.default.user.update({
                where: { id: user.id },
                data: {
                    refreshToken,
                    lastConnexion: new Date(),
                },
            });
        }
        else {
            // Session existante → juste mettre à jour la dernière connexion
            yield prisma_client_js_1.default.user.update({
                where: { id: user.id },
                data: {
                    lastConnexion: new Date(),
                },
            });
        }
        // 📊 EXTRACTION DES DONNÉES UTILISATEUR (sans le mot de passe)
        const { password: _ } = user, userData = __rest(user, ["password"]);
        // 🔑 EXTRACTION DES PERMISSIONS ET RÔLES
        const permissions = userData.roles.flatMap((userRole) => {
            return userRole.role.permissions.map((permission) => {
                return {
                    permissionKey: permission.permission.permissionKey,
                    title: permission.permission.title,
                };
            });
        });
        const permissionKeys = user.roles.flatMap((userRole) => {
            return userRole.role.permissions.map((permission) => {
                return permission.permission.permissionKey;
            });
        });
        const roles = user.roles.map((userRole) => {
            return userRole.role.name;
        });
        // 🔄 DÉDUPLICATION DES PERMISSIONS
        const uniquePermissions = Array.from(new Map(permissions.map((permission) => {
            return [permission.permissionKey, permission];
        })).values());
        // 📤 RÉPONSE DE CONNEXION RÉUSSIE
        return response_js_1.default.success(res, "Connexion réussie", {
            token: {
                type: "Bearer",
                AccessToken,
                refreshToken: shouldCreateNewSession ? refreshToken : user.refreshToken, // Utiliser le token approprié
            },
            user: userData,
        });
    }
    catch (error) {
        // 🚨 GESTION D'ERREURS DÉTAILLÉE
        console.error("❌ Erreur lors de la connexion:", {
            error: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            userAgent: req.get("User-Agent"),
            ip: req.ip || req.connection.remoteAddress,
        });
        // Gestion d'erreurs spécifiques
        if (error.code === "P2002") {
            // Erreur de contrainte unique Prisma
            return response_js_1.default.error(res, "Conflit de données lors de la connexion", "Un problème de données a été détecté", 409);
        }
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
            // Erreur de base de données
            return response_js_1.default.error(res, "Service temporairement indisponible", "Problème de connexion à la base de données", 503);
        }
        if (error.name === "ValidationError") {
            // Erreur de validation
            return response_js_1.default.error(res, "Données invalides", error.message, 400);
        }
        // Erreur générique
        return response_js_1.default.error(res, "Une erreur interne est survenue lors de la connexion", process.env.NODE_ENV === "development" ? error.message : "Erreur serveur", 500);
    }
});
exports.login = login;
/**
 * Refresh TOKEN
 */
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 🔐 SUPPORT MULTI-SOURCE POUR REFRESH TOKEN
        // Essayer de récupérer le refresh token depuis plusieurs sources
        const { jwt: cookieToken } = req.cookies || {};
        const { refreshToken: bodyToken } = req.body || {};
        const refreshToken = bodyToken || cookieToken;
        if (!refreshToken) {
            return response_js_1.default.error(res, "Aucun refresh token fourni", {
                code: "NO_REFRESH_TOKEN",
                sources: {
                    cookie: !!cookieToken,
                    body: !!bodyToken,
                },
            }, 400);
        }
        // Vérifier et décoder le refresh token
        const decoded = (0, token_js_1.verifyToken)(refreshToken);
        if (!decoded) {
            return response_js_1.default.error(res, "Refresh token invalide", {
                code: "INVALID_REFRESH_TOKEN",
            }, 400);
        }
        // Récupérer l'utilisateur
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            return response_js_1.default.error(res, "Utilisateur non trouvé", {
                code: "USER_NOT_FOUND",
            }, 404);
        }
        // 🔐 VALIDATION PERMISSIVE POUR MULTI-DEVICE
        // Stratégie: Accepter les anciens refresh tokens pour permettre plusieurs appareils connectés
        const storedToken = user.refreshToken;
        if (storedToken && storedToken !== refreshToken) {
            console.log(`ℹ️ [MultiDevice] Utilisateur ${user.id} utilise un ancien refresh token - Autorisé`);
            // ✅ On continue le processus (stratégie permissive pour multi-device)
        }
        // 🔄 GÉNÉRATION DU NOUVEAU ACCESS TOKEN
        const newAccessToken = (0, token_js_1.generateToken)({
            id: user.id,
            email: user.email,
        });
        // � ROTATION OPTIONNELLE DU REFRESH TOKEN
        // Générer un nouveau refresh token pour une sécurité renforcée
        const newRefreshToken = (0, token_js_1.generateRefreshToken)({
            id: user.id,
            email: user.email,
        });
        // � STRATÉGIE DE MISE À JOUR INTELLIGENTE
        // Mettre à jour seulement si:
        // - Pas de refresh token en base OU
        // - Token reçu via body (rotation explicite demandée)
        const shouldRotateToken = !user.refreshToken || !!bodyToken;
        if (shouldRotateToken) {
            yield prisma_client_js_1.default.user.update({
                where: { id: user.id },
                data: {
                    refreshToken: newRefreshToken,
                    lastConnexion: new Date(),
                },
            });
        }
        // 🍪 MISE À JOUR DU COOKIE SI NÉCESSAIRE
        // Seulement si le token venait du cookie ET qu'on a fait une rotation
        if (cookieToken && shouldRotateToken) {
            res.cookie("jwt", newRefreshToken, {
                httpOnly: true,
                secure: config_js_1.default.nodeEnv === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
            });
        }
        // 📤 RÉPONSE AVEC LES NOUVEAUX TOKENS
        return response_js_1.default.success(res, "Token rafraîchi avec succès", {
            token: Object.assign({ type: "Bearer", AccessToken: newAccessToken }, (bodyToken &&
                shouldRotateToken && { RefreshToken: newRefreshToken })),
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        });
    }
    catch (error) {
        console.error("Erreur lors du refresh token:", error);
        // 🔐 GESTION SÉCURISÉE DES ERREURS
        if (error.name === "TokenExpiredError") {
            return response_js_1.default.error(res, "Refresh token expiré", {
                code: "REFRESH_TOKEN_EXPIRED",
                expiredAt: error.expiredAt,
            }, 401);
        }
        else if (error.name === "JsonWebTokenError") {
            return response_js_1.default.error(res, "Refresh token malformé", {
                code: "MALFORMED_REFRESH_TOKEN",
            }, 400);
        }
        return response_js_1.default.error(res, "Erreur lors du rafraîchissement du token", {
            code: "REFRESH_ERROR",
            message: error.message,
        }, 500);
    }
});
exports.refreshToken = refreshToken;
const logout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jwt } = req.cookies;
        const refreshToken = jwt;
        // 🧹 NETTOYAGE SYSTÉMATIQUE DU COOKIE
        const clearCookieOptions = {
            httpOnly: true,
            secure: config_js_1.default.nodeEnv === "production",
            sameSite: "strict",
        };
        // Si pas de refresh token, considérer comme déjà déconnecté
        if (!refreshToken) {
            res.clearCookie("jwt", clearCookieOptions);
            return response_js_1.default.success(res, "Utilisateur déjà déconnecté", {}, 200);
        }
        // 🔍 RECHERCHE ET RÉVOCATION DU TOKEN
        const user = yield prisma_client_js_1.default.user.findFirst({ where: { refreshToken } });
        if (user) {
            yield prisma_client_js_1.default.user.update({
                where: { id: user.id },
                data: { refreshToken: null },
            });
            console.log(`✅ [Logout] Token révoqué pour utilisateur ${user.id}`);
        }
        else {
            console.log(`⚠️ [Logout] Aucun utilisateur trouvé pour ce refresh token`);
        }
        // 🧹 NETTOYAGE FINAL DU COOKIE
        res.clearCookie("jwt", clearCookieOptions);
        return response_js_1.default.success(res, "Déconnexion réussie", {}, 200);
    }
    catch (error) {
        console.error("❌ [Logout] Erreur:", error);
        // 🛡️ NETTOYAGE DE SÉCURITÉ même en cas d'erreur
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: config_js_1.default.nodeEnv === "production",
            sameSite: "strict",
        });
        return response_js_1.default.success(res, "Déconnexion forcée (nettoyage sécurisé)", {}, 200);
    }
});
exports.logout = logout;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { email } = req.body;
        if (!email) {
            return response_js_1.default.error(res, "Email est requis", null, 400);
        }
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            return response_js_1.default.notFound(res, "Aucun utilisateur avec cet email", 404);
        }
        const resetToken = (0, token_js_1.generateResToken)({
            id: user.id,
            email: user.email,
        });
        // 🔍 LOG: Token généré pour forgot password
        console.log("🔍 Forgot Password - Token généré:", {
            userId: user.id,
            tokenLength: resetToken.length,
            tokenStart: resetToken.substring(0, 50) + "...",
        });
        yield prisma_client_js_1.default.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 heure pour correspondre au JWT
            },
        });
        // 🔍 LOG: Vérification après sauvegarde
        const savedUser = yield prisma_client_js_1.default.user.findUnique({
            where: { id: user.id },
            select: { resetToken: true, resetExpires: true },
        });
        console.log("🔍 Forgot Password - Token sauvegardé:", {
            savedTokenLength: (_a = savedUser === null || savedUser === void 0 ? void 0 : savedUser.resetToken) === null || _a === void 0 ? void 0 : _a.length,
            savedTokenStart: ((_b = savedUser === null || savedUser === void 0 ? void 0 : savedUser.resetToken) === null || _b === void 0 ? void 0 : _b.substring(0, 50)) + "...",
            expiresAt: savedUser === null || savedUser === void 0 ? void 0 : savedUser.resetExpires,
        });
        const resetUrl = `${config_js_1.default.frontendUrl}/auth/reset-password?token=${resetToken}`;
        const emailSent = yield (0, mailer_js_1.sendEmail)(email, "Réinitialisation de votre mot de passe", `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}`, `<p>Cliquez <a href="${resetUrl}">ici</a> pour réinitialiser votre mot de passe.</p>`);
        if (!emailSent) {
            return response_js_1.default.error(res, "Erreur lors de l'envoi de l'email", null, 500);
        }
        return response_js_1.default.success(res, "Email de réinitialisation envoyé", null, 200);
    }
    catch (error) {
        console.error("Erreur lors de la demande de réinitialisation:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la demande de réinitialisation", error.message, 500);
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { token: rawToken, newPassword } = req.body;
        // Décodage URL du token au cas où il serait encodé
        const token = decodeURIComponent(rawToken);
        if (!token || !newPassword) {
            return response_js_1.default.error(res, "Token et nouveau mot de passe sont requis", null, 400);
        }
        let decoded;
        try {
            decoded = (0, token_js_1.verifyToken)(token);
            console.log("🔍 Reset Password - Token decoded successfully:", {
                userId: decoded === null || decoded === void 0 ? void 0 : decoded.id,
            });
        }
        catch (jwtError) {
            console.log("🔍 Reset Password - JWT Error:", {
                error: jwtError.message,
                name: jwtError.name,
            });
            return response_js_1.default.error(res, "Token invalide ou expiré", null, 400);
        }
        if (!decoded) {
            return response_js_1.default.error(res, "Token invalide ou expiré", null, 400);
        }
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: decoded.id },
        });
        // 🔍 LOG 3: Vérification de l'utilisateur et du token stocké
        console.log("🔍 Reset Password - User check:", {
            userExists: !!user,
            hasResetToken: !!(user === null || user === void 0 ? void 0 : user.resetToken),
            tokenMatch: (user === null || user === void 0 ? void 0 : user.resetToken) === token,
            hasResetExpires: !!(user === null || user === void 0 ? void 0 : user.resetExpires),
            expiresAt: user === null || user === void 0 ? void 0 : user.resetExpires,
            now: new Date(),
        });
        // 🔍 LOG 4: Comparaison détaillée des tokens
        console.log("🔍 Reset Password - Token comparison:", {
            tokenFromRequest: token.substring(0, 50) + "...",
            tokenFromDB: ((_a = user === null || user === void 0 ? void 0 : user.resetToken) === null || _a === void 0 ? void 0 : _a.substring(0, 50)) + "...",
            tokenLengths: {
                request: token.length,
                db: (_b = user === null || user === void 0 ? void 0 : user.resetToken) === null || _b === void 0 ? void 0 : _b.length,
            },
            areEqual: (user === null || user === void 0 ? void 0 : user.resetToken) === token,
        });
        if (!user || user.resetToken !== token || !user.resetExpires) {
            return response_js_1.default.error(res, "Token invalide ou expiré", null, 400);
        }
        if (user.resetExpires < new Date()) {
            return response_js_1.default.error(res, "Token expiré", null, 400);
        }
        const hashedPassword = yield (0, bcrypt_js_1.hashPassword)(newPassword);
        const newUser = yield prisma_client_js_1.default.user.update({
            where: { id: decoded.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetExpires: null,
            },
        });
        console.log("✅ Reset Password - Succès pour userId:", decoded.id);
        return response_js_1.default.success(res, "Mot de passe réinitialisé avec succès", newUser, 200);
    }
    catch (error) {
        console.error("❌ Erreur lors de la réinitialisation du mot de passe:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la réinitialisation du mot de passe", error.message, 500);
    }
});
exports.resetPassword = resetPassword;
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return response_js_1.default.error(res, "Utilisateur non authentifié", null, 401);
        }
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isVerified: true,
                status: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
                lastConnexion: true,
                roles: {
                    select: {
                        id: true,
                        roleId: true,
                        userId: true,
                        assignedAt: true,
                        assignedBy: true,
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                createdAt: true,
                                updatedAt: true,
                                permissions: {
                                    select: {
                                        id: true,
                                        roleId: true,
                                        permissionId: true,
                                        assignedAt: true,
                                        permission: {
                                            select: {
                                                id: true,
                                                permissionKey: true,
                                                title: true,
                                                description: true,
                                                createdAt: true,
                                                updatedAt: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                products: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        quantity: true,
                        description: true,
                        images: true,
                        status: true,
                        etat: true,
                        quartier: true,
                        telephone: true,
                        createdAt: true,
                        updatedAt: true,
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        city: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            return response_js_1.default.notFound(res, "Utilisateur non trouvé", 404);
        }
        // 🔧 Transformer les images des produits en URLs complètes
        const userWithImageUrls = Object.assign(Object.assign({}, user), { products: ((_b = user.products) === null || _b === void 0 ? void 0 : _b.map((product) => (Object.assign(Object.assign({}, product), { images: Array.isArray(product.images)
                    ? product.images.map((imagePath) => utils_js_1.default.resolveFileUrl(req, imagePath))
                    : [] })))) || [] });
        return response_js_1.default.success(res, "Profil utilisateur récupéré avec succès", userWithImageUrls, 200);
    }
    catch (error) {
        console.error("Erreur lors de la récupération du profil utilisateur:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la récupération du profil utilisateur", error.message, 500);
    }
});
exports.getUserProfile = getUserProfile;
/**
 * Fonction de callback après authentification Google réussie
 */
const googleCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // L'utilisateur est disponible dans req.user grâce à passport
        const user = req.user;
        if (!user) {
            console.error("Aucun utilisateur trouvé dans req.user");
            res.redirect(`${config_js_1.default.frontendUrl}/auth/login?error=auth_failed`);
            return;
        }
        // 🔐 GÉNÉRATION DES TOKENS D'ACCÈS ET DE RAFRAÎCHISSEMENT
        const AccessToken = (0, token_js_1.generateToken)({
            id: user.id,
            email: user.email,
        });
        const newRefreshToken = (0, token_js_1.generateRefreshToken)({
            id: user.id,
            email: user.email,
        });
        // 🔐 GESTION MULTI-DEVICE: Vérifier l'état actuel des tokens
        const currentUser = yield prisma_client_js_1.default.user.findUnique({
            where: { id: user.id },
            select: { refreshToken: true },
        });
        const finalRefreshToken = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.refreshToken) || newRefreshToken;
        const shouldUpdateToken = !(currentUser === null || currentUser === void 0 ? void 0 : currentUser.refreshToken);
        // 📝 MISE À JOUR EN BASE: Seulement si nécessaire
        yield prisma_client_js_1.default.user.update({
            where: { id: user.id },
            data: Object.assign(Object.assign({}, (shouldUpdateToken && { refreshToken: finalRefreshToken })), { lastConnexion: new Date() }),
        });
        // 🍪 CONFIGURATION DU COOKIE DE SESSION
        res.cookie("jwt", finalRefreshToken, {
            httpOnly: true,
            secure: config_js_1.default.nodeEnv === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
        });
        console.log("✅ [GoogleAuth] Connexion réussie:", {
            id: user.id,
            email: user.email,
            tokenGenerated: true,
            sessionId: req.sessionID,
            isMultiDevice: !shouldUpdateToken, // Indique si c'est une session supplémentaire
            tokenStrategy: shouldUpdateToken ? "nouveau_token" : "token_existant",
        });
        // Rediriger vers le frontend avec le token en paramètre
        res.redirect(`${config_js_1.default.frontendUrl}/auth/social-callback?token=${encodeURIComponent(AccessToken)}`);
    }
    catch (error) {
        console.error("Erreur lors de la connexion Google:", error);
        // Détruire la session en cas d'erreur pour éviter les états incohérents
        if (req.session) {
            req.session.destroy((err) => {
                if (err)
                    console.error("Erreur lors de la destruction de session:", err);
            });
        }
        res.redirect(`${config_js_1.default.frontendUrl}/auth/login?error=server_error`);
    }
});
exports.googleCallback = googleCallback;
