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
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const config_js_1 = __importDefault(require("./config.js"));
const notification_service_js_1 = require("../services/notification.service.js");
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_client_js_1.default.user.findUnique({ where: { id } });
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
}));
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: config_js_1.default.GOOGLE_CLIENT_ID,
    clientSecret: config_js_1.default.GOOGLE_CLIENT_SECRET,
    callbackURL: config_js_1.default.GOOGLE_CALLBACK_URL,
    scope: ["profile", "email"],
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = yield prisma_client_js_1.default.user.findFirst({
            where: {
                OR: [
                    { email: (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value },
                    { googleId: profile.id },
                ],
            },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        // Si l'utilisateur existe, retourner cet utilisateur
        if (existingUser) {
            // Mettre à jour googleId s'il n'existe pas encore
            if (!existingUser.googleId) {
                yield prisma_client_js_1.default.user.update({
                    where: { id: existingUser.id },
                    data: {
                        googleId: profile.id,
                        lastConnexion: new Date(),
                    },
                });
            }
            else {
                // Mettre à jour la dernière connexion
                yield prisma_client_js_1.default.user.update({
                    where: { id: existingUser.id },
                    data: { lastConnexion: new Date() },
                });
            }
            return done(null, existingUser);
        }
        // Créer un nouvel utilisateur
        const names = profile.displayName.split(" ");
        const firstName = names[0] || "";
        const lastName = names.slice(1).join(" ") || "";
        const newUser = yield prisma_client_js_1.default.user.create({
            data: {
                email: ((_d = (_c = profile.emails) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) || "",
                firstName,
                lastName,
                password: "", // Pas de mot de passe pour l'authentification Google
                googleId: profile.id,
                avatar: (_f = (_e = profile.photos) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value,
                isVerified: true, // L'email est déjà vérifié par Google
                status: "ACTIVE",
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
        // Créer notification de bienvenue
        yield (0, notification_service_js_1.createNotification)(newUser.id, "Bienvenue sur BuyamSale", "Votre compte a été créé avec succès via Google. Bienvenue !", {
            type: "WELCOME",
            link: "/",
        });
        return done(null, newUser);
    }
    catch (error) {
        return done(error, undefined);
    }
})));
exports.default = passport_1.default;
