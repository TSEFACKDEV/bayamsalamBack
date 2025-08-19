"use strict";
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
exports.getUserProfile = exports.resetPassword = exports.forgotPassword = exports.logout = exports.refreshToken = exports.login = exports.verifyOTP = exports.register = void 0;
const bcrypt_js_1 = require("../utilities/bcrypt.js");
const token_js_1 = require("../utilities/token.js");
const mailer_js_1 = require("../utilities/mailer.js");
const sms_js_1 = require("../utilities/sms.js");
const otp_js_1 = require("../utilities/otp.js");
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const config_js_1 = __importDefault(require("../config/config.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const otpEmailTemplate_js_1 = require("../templates/otpEmailTemplate.js");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, firstName, lastName, phone } = req.body;
        if (!email || !password || !firstName || !lastName || !phone) {
            return response_js_1.default.error(res, "Tous les champs sont obligatoires", null, 400);
        }
        const existingUser = yield prisma_client_js_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return response_js_1.default.error(res, "Un utilisateur avec cet email existe déjà", null, 400);
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
        /* log de l'otp pour le developement sans connexion */
        console.log("====================================");
        console.log(otp);
        console.log("====================================");
        if (!smsSent) {
            // Plus besoin de logoUrl !
            const htmlTemplate = (0, otpEmailTemplate_js_1.createOTPEmailTemplate)(firstName, lastName, otp);
            yield (0, mailer_js_1.sendEmail)(email, "🔐 Code de vérification BuyamSale - Bienvenue !", `Bonjour ${firstName} ${lastName},\n\nVotre code OTP est: ${otp}\n\nBienvenue sur BuyamSale !`, htmlTemplate);
        }
        yield prisma_client_js_1.default.user.update({
            where: { id: newUser.id },
            data: { otp },
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
        if (!(0, otp_js_1.validateOTP)(otp, existingUser.otp)) {
            return response_js_1.default.error(res, "OTP invalide", null, 400);
        }
        const user = yield prisma_client_js_1.default.user.update({
            where: { id: userId },
            data: {
                otp: null,
                isVerified: true,
                status: "ACTIVE",
            },
        });
        return response_js_1.default.success(res, "OTP vérifié avec succès", user, 200);
    }
    catch (error) {
        console.error("Erreur lors de la vérification OTP:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la vérification OTP", error.message, 500);
    }
});
exports.verifyOTP = verifyOTP;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
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
        const AccessToken = (0, token_js_1.generateToken)({
            id: user.id,
            email: user.email,
        });
        const refreshToken = (0, token_js_1.generateRefreshToken)({
            id: user.id,
            email: user.email,
        });
        const { password: _ } = user, userData = __rest(user, ["password"]);
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
        // Récuperation des permissions sans doublons
        const uniquePermissions = Array.from(new Map(permissions.map((permission) => {
            return [permission.permissionKey, permission];
        })).values());
        // userData.roles = roles;
        // userData.permissions = uniquePermissions;
        // userData.permissionKeys = permissionKeys;
        return response_js_1.default.success(res, "Connexion réussie", {
            token: {
                type: "Bearer",
                AccessToken,
                refreshToken,
            },
            user: userData,
        });
    }
    catch (error) {
        console.error("Erreur lors de la connexion:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la connexion", error.message, 500);
    }
});
exports.login = login;
/**
 * Refresh TOKEN
 */
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jwt } = req.cookies;
        const refreshToken = jwt;
        if (!refreshToken) {
            return response_js_1.default.error(res, "No Refresh Token found", 400);
        }
        const decoded = (0, token_js_1.verifyToken)(refreshToken);
        if (!decoded) {
            return response_js_1.default.error(res, "Invalid Refresh Token", 400);
        }
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            return response_js_1.default.error(res, "User not found", 404);
        }
        const newAccessToken = (0, token_js_1.generateToken)({
            id: user.id,
            email: user.email,
        });
        return response_js_1.default.success(res, "Token refreshed successfully", {
            token: {
                type: "Bearer",
                AccessToken: newAccessToken,
            },
        });
    }
    catch (error) {
        console.error("Error refreshing token:", error);
        return response_js_1.default.error(res, "An error occurred while refreshing token", error.message, 500);
    }
});
exports.refreshToken = refreshToken;
/**
 * Déconnexion de l'utilisateur.
 */
const logout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jwt } = req.cookies;
        const refreshToken = jwt;
        // Si pas de refresh token, on considère que l'utilisateur est déjà déconnecté
        if (!refreshToken) {
            // Supprimer le cookie quand même par sécurité
            res.clearCookie("jwt", {
                httpOnly: true,
                secure: config_js_1.default.nodeEnv === "production",
                sameSite: "strict",
            });
            return response_js_1.default.success(res, "Already logged out", {}, 200);
        }
        // Révoquer le Refresh Token dans la base de données
        const user = yield prisma_client_js_1.default.user.findFirst({ where: { refreshToken } });
        console.log("Utilisateur trouvé pour ce refreshToken:", user);
        if (user) {
            yield prisma_client_js_1.default.user.update({
                where: { id: user.id },
                data: { refreshToken: null },
            });
        }
        // Supprimer le cookie dans tous les cas
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: config_js_1.default.nodeEnv === "production",
            sameSite: "strict",
        });
        return response_js_1.default.success(res, "Logout successful !!!", {}, 200);
    }
    catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
        // Même en cas d'erreur, supprimer le cookie pour forcer la déconnexion côté client
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: config_js_1.default.nodeEnv === "production",
            sameSite: "strict",
        });
        return response_js_1.default.success(res, "Logout completed with cleanup", {}, 200);
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
        // 🔧 CORRECTION : Génération du lien de réinitialisation
        // PROBLÈME : Avant, le lien pointait vers l'accueil avec ?token=xxx
        // SOLUTION : Maintenant, le lien pointe vers la page spécifique de reset password
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
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
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
        return response_js_1.default.success(res, "Profil utilisateur récupéré avec succès", user, 200);
    }
    catch (error) {
        console.error("Erreur lors de la récupération du profil utilisateur:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la récupération du profil utilisateur", error.message, 500);
    }
});
exports.getUserProfile = getUserProfile;
