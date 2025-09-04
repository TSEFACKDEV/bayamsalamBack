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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticate = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_js_1 = __importDefault(require("../config/config.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
//Middleware pour verifier si l'utilisateur est authentifier
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Récupérer le token de l'en-tête Authorization
        const authHeader = req.header("Authorization");
        const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))
            ? authHeader.substring(7) // Enlever "Bearer " pour obtenir le token
            : authHeader; // Utiliser le token tel quel s'il n'y a pas "Bearer "
        if (!token) {
            return response_js_1.default.error(res, "Utilisateur non authentifié", null, 401);
        }
        // Décoder le token JWT
        const decoded = jsonwebtoken_1.default.verify(token, config_js_1.default.jwtSecret);
        console.log('====================================');
        console.log("Token decoded:", decoded);
        console.log('====================================');
        // Récupérer l'utilisateur à partir de l'ID dans le token
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            return response_js_1.default.error(res, "Utilisateur non trouvé", null, 404);
        }
        // Attacher l'utilisateur à la requête pour les contrôleurs
        req.authUser = user;
        next();
    }
    catch (error) {
        console.error("Erreur d'authentification:", error);
        return response_js_1.default.error(res, "Utilisateur non authentifié", null, 401);
    }
});
exports.authenticate = authenticate;
//Middleware pour verifier si un utilisateur a l'authorization de faire certaine taches
const isAdmin = (req, res, next) => {
    const token = req.headers.authorization; // Prend le token tel quel, sans "Bearer "
    if (!token) {
        response_js_1.default.notFound(res, "Token manquant ou invalide");
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_js_1.default.jwtSecret);
        // Vérifie si l'utilisateur a le rôle admin
        if (decoded.role !== "ADMIN") {
            response_js_1.default.notFound(res, "Accès refusé : utilisateur non autorisé");
            return;
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        response_js_1.default.notFound(res, "Token invalide ou expiré");
    }
};
exports.isAdmin = isAdmin;
