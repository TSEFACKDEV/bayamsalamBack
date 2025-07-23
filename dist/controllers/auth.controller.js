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
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import { comparePassword, hashPassword } from "../utilities/bcrypt.js";
import { generateResToken, generateToken } from "../utilities/token.js";
export const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name } = req.body;
        // verifier si l'utilisateur existe déjà
        const existingUser = yield prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return ResponseApi.error(res, "User already exists", null, 500);
        }
        const hashPassord = yield hashPassword(password);
        // créer un nouvel utilisateur
        const newUser = yield prisma.user.create({
            data: {
                email,
                password: hashPassord,
                name: name,
            },
        });
        //generer un token de verification
        const token = generateToken({
            id: newUser.id,
            email: newUser.email,
        });
        // on retire le mot de passe de la réponse
        const { password: _ } = newUser, userWithoutPassword = __rest(newUser, ["password"]);
        ResponseApi.success(res, "User registered successfully", { user: userWithoutPassword, token }, 201);
    }
    catch (error) {
        console.error("Error in register:", error);
        ResponseApi.error(res, "An error occurred during registration", 500);
    }
});
export const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Vérifier si l'utilisateur existe
        const user = yield prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return ResponseApi.error(res, "Invalid email or password", null, 401);
        }
        // Comparer le mot de passe
        const isPasswordValid = yield comparePassword(password, user.password);
        if (!isPasswordValid) {
            return ResponseApi.error(res, "Invalid email or password", null, 401);
        }
        // Générer un token
        const token = generateToken({
            id: user.id,
            email: user.email,
        });
        // Retirer le mot de passe de la réponse
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        ResponseApi.success(res, "Login successful", { user: userWithoutPassword, token }, 200);
    }
    catch (error) {
        console.error("Error in login:", error);
        ResponseApi.error(res, "An error occurred during login", 500);
    }
});
export const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Assurez-vous que l'ID de l'utilisateur est disponible dans req.user
        if (!userId) {
            return ResponseApi.error(res, "User not authenticated", null, 401);
        }
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                createdAt: true,
            },
        });
        if (!user) {
            return ResponseApi.notFound(res, "User not found", 404);
        }
        ResponseApi.success(res, "User profile retrieved successfully", user);
    }
    catch (error) {
        console.error("Error in getUserProfile:", error);
        ResponseApi.error(res, "An error occurred while retrieving the user profile", 500);
    }
});
export const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        // Vérifier si l'utilisateur existe
        const user = yield prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return ResponseApi.error(res, "User not found", null, 404);
        }
        // Générer un token de réinitialisation
        const resetToken = generateResToken({ id: user.id, email: user.email });
        const resetExpires = new Date(Date.now() + 3600000); // 1 heure
        // Mettre à jour l'utilisateur avec le token et la date d'expiration
        yield prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetExpires,
            },
        });
    }
    catch (error) {
        console.error("Error in forgotPassword:", error);
        ResponseApi.error(res, "An error occurred during password reset", 500);
    }
});
