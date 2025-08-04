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
exports.resetPassword = exports.forgotPassword = exports.logout = exports.login = exports.verifyOTP = exports.register = void 0;
const bcrypt_js_1 = require("../utilities/bcrypt.js");
const token_js_1 = require("../utilities/token.js");
const mailer_js_1 = require("../utilities/mailer.js");
const sms_js_1 = require("../utilities/sms.js");
const otp_js_1 = require("../utilities/otp.js");
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const config_js_1 = __importDefault(require("../config/config.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
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
        if (!smsSent) {
            yield (0, mailer_js_1.sendEmail)(email, "Votre code de vérification", `Votre code OTP est: ${otp}`);
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
// export const login = async (req: Request, res: Response): Promise<any> => {
//   try {
//     const { email, password }: LoginData = req.body;
//     if (!email || !password) {
//       return ResponseApi.error(res, "Email et mot de passe sont requis", null, 400);
//     }
//     const user = await prisma.user.findUnique({
//       where: { email },
//     });
//     if (!user) {
//       return ResponseApi.error(res, "Email ou mot de passe incorrect", null, 401);
//     }
//     if (!user.isVerified) {
//       return ResponseApi.error(res, "Compte non vérifié. Veuillez vérifier votre email.", null, 403);
//     }
//     const isPasswordValid = await comparePassword(password, user.password);
//     if (!isPasswordValid) {
//       return ResponseApi.error(res, "Email ou mot de passe incorrect", null, 401);
//     }
//     const token = generateToken({
//       id: user.id,
//       email: user.email,
//     });
//     const { password: _, ...userData } = user;
//     return ResponseApi.success(res, "Connexion réussie", {
//       token,
//       user: userData,
//     });
//   } catch (error: any) {
//     console.error("Erreur lors de la connexion:", error);
//     return ResponseApi.error(res, "Une erreur est survenue lors de la connexion", error.message, 500);
//   }
// };
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phone, password } = req.body;
        if ((!email && !phone) || !password) {
            return response_js_1.default.error(res, "Email ou téléphone et mot de passe sont requis", null, 400);
        }
        const user = yield prisma_client_js_1.default.user.findFirst({
            where: {
                OR: [
                    email ? { email } : undefined,
                    phone ? { phone } : undefined,
                ].filter(Boolean),
            },
        });
        if (!user) {
            return response_js_1.default.error(res, "Email/téléphone ou mot de passe incorrect", null, 401);
        }
        if (!user.isVerified) {
            return response_js_1.default.error(res, "Compte non vérifié. Veuillez vérifier votre email.", null, 403);
        }
        const isPasswordValid = yield (0, bcrypt_js_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return response_js_1.default.error(res, "Email/téléphone ou mot de passe incorrect", null, 401);
        }
        const token = (0, token_js_1.generateToken)({
            id: user.id,
            email: user.email,
        });
        const { password: _ } = user, userData = __rest(user, ["password"]);
        return response_js_1.default.success(res, "Connexion réussie", {
            token,
            user: userData,
        });
    }
    catch (error) {
        console.error("Erreur lors de la connexion:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la connexion", error.message, 500);
    }
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return response_js_1.default.success(res, "Déconnexion réussie", null);
});
exports.logout = logout;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield prisma_client_js_1.default.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetExpires: new Date(Date.now() + 3600000),
            },
        });
        const resetUrl = `${config_js_1.default.frontendUrl}/reset-password?token=${resetToken}`;
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
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return response_js_1.default.error(res, "Token et nouveau mot de passe sont requis", null, 400);
        }
        const decoded = (0, token_js_1.verifyToken)(token);
        if (!decoded) {
            return response_js_1.default.error(res, "Token invalide ou expiré", null, 400);
        }
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: decoded.id },
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
        return response_js_1.default.success(res, "Mot de passe réinitialisé avec succès", newUser, 200);
    }
    catch (error) {
        console.error("Erreur lors de la réinitialisation du mot de passe:", error);
        return response_js_1.default.error(res, "Une erreur est survenue lors de la réinitialisation du mot de passe", error.message, 500);
    }
});
exports.resetPassword = resetPassword;
