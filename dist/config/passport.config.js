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
    scope: ['profile', 'email'],
    // Ajouter des options pour gérer les timeouts et conflits
    passReqToCallback: false,
    skipUserProfile: false,
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Ajouter un délai aléatoire pour éviter les conflits de concurrence
        yield new Promise((resolve) => setTimeout(resolve, Math.random() * 500));
        // Utiliser une transaction pour éviter les conditions de course
        const result = yield prisma_client_js_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            // Vérifier si l'utilisateur existe déjà
            const existingUser = yield tx.user.findFirst({
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
            // Si l'utilisateur existe, mettre à jour ses informations
            if (existingUser) {
                const updatedUser = yield tx.user.update({
                    where: { id: existingUser.id },
                    data: Object.assign({ googleId: profile.id, lastConnexion: new Date() }, (((_d = (_c = profile.photos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) && {
                        avatar: profile.photos[0].value,
                    })),
                    include: {
                        roles: {
                            include: {
                                role: true,
                            },
                        },
                    },
                });
                return updatedUser;
            }
            // Vérifier s'il y a déjà un utilisateur avec cet email
            const emailUser = yield tx.user.findUnique({
                where: { email: (_f = (_e = profile.emails) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value },
            });
            if (emailUser) {
                // Lier le compte Google à l'utilisateur existant
                const linkedUser = yield tx.user.update({
                    where: { id: emailUser.id },
                    data: Object.assign({ googleId: profile.id, lastConnexion: new Date(), isVerified: true }, (((_h = (_g = profile.photos) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.value) && {
                        avatar: profile.photos[0].value,
                    })),
                    include: {
                        roles: {
                            include: {
                                role: true,
                            },
                        },
                    },
                });
                return linkedUser;
            }
            // Créer un nouvel utilisateur
            const names = ((_j = profile.displayName) === null || _j === void 0 ? void 0 : _j.split(' ')) || ['', ''];
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';
            const newUser = yield tx.user.create({
                data: {
                    email: ((_l = (_k = profile.emails) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.value) || '',
                    firstName,
                    lastName,
                    password: '', // Pas de mot de passe pour l'authentification Google
                    googleId: profile.id,
                    avatar: (_o = (_m = profile.photos) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.value,
                    isVerified: true, // L'email est déjà vérifié par Google
                    status: 'ACTIVE',
                    lastConnexion: new Date(),
                },
            });
            // Ajout automatique du rôle USER
            const userRole = yield tx.role.findUnique({
                where: { name: 'USER' },
            });
            if (userRole) {
                yield tx.userRole.create({
                    data: {
                        userId: newUser.id,
                        roleId: userRole.id,
                    },
                });
            }
            return newUser;
        }));
        // Créer notification de bienvenue en dehors de la transaction
        // Seulement pour les nouveaux utilisateurs ou ceux qui se connectent pour la première fois aujourd'hui
        const isNewConnection = !result.lastConnexion ||
            new Date(result.lastConnexion).toDateString() !==
                new Date().toDateString();
        if (isNewConnection) {
            try {
                yield (0, notification_service_js_1.createNotification)(result.id, 'Bienvenue sur BuyAndSale', result.lastConnexion
                    ? 'Heureux de vous revoir sur BuyAndSale !'
                    : 'Votre compte a été créé avec succès via Google. Bienvenue !', {
                    type: 'WELCOME',
                    link: '/',
                });
            }
            catch (notificationError) {
                // Log l'erreur mais ne pas faire échouer l'authentification
                console.error('Erreur lors de la création de la notification:', notificationError);
            }
        }
        return done(null, result);
    }
    catch (error) {
        console.error("Erreur d'authentification Google:", error);
        return done(error, undefined);
    }
})));
exports.default = passport_1.default;
