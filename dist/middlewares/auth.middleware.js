var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import ResponseApi from "../helper/response.js";
import jwt from "jsonwebtoken";
import env from "../config/config.js";
import prisma from "../model/prisma.client.js";
//Middlewqre pour verifier si l'utilisateur est authentifier
export const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return ResponseApi.notFound(res, "Authentification required");
        }
        const decoded = jwt.verify(token, env.jwtSecret);
        const user = prisma.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            return ResponseApi.notFound(res, "User not Found");
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.notFound(res, "Invalid Token");
    }
});
//Middleware pour verifier si un utilisateur a l'authorization de faire certaine taches
export const isAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "ADMIN") {
        return res.status(403).json({ message: "Accès refusé" });
    }
    next();
};
