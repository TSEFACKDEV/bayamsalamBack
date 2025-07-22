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
import { generateToken } from "../utilities/token.js";
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
