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
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getUserNotifications = exports.createNotification = void 0;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const socket_js_1 = require("../utilities/socket.js");
const createNotification = (userId, title, message, options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        // ✅ Création de la notification en base (opération critique)
        const notification = yield prisma_client_js_1.default.notification.create({
            data: {
                userId,
                title,
                message,
                data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : null,
                link: (_b = options === null || options === void 0 ? void 0 : options.link) !== null && _b !== void 0 ? _b : null,
                type: (_c = options === null || options === void 0 ? void 0 : options.type) !== null && _c !== void 0 ? _c : null,
            },
        });
        // ✅ Émission Socket.io en arrière-plan (non-critique)
        // Utiliser setImmediate pour ne pas bloquer la réponse
        setImmediate(() => {
            try {
                const io = (0, socket_js_1.getIO)();
                io.to(userId).emit("notification", notification);
            }
            catch (socketError) {
                // Socket pas initialisé ou utilisateur déconnecté -> ignore silencieusement
                console.warn(`Socket.io notification failed for user ${userId}:`, socketError);
            }
        });
        return notification;
    }
    catch (error) {
        console.error("Failed to create notification:", error);
        throw error; // Re-throw pour que l'appelant puisse gérer l'erreur
    }
});
exports.createNotification = createNotification;
const getUserNotifications = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_client_js_1.default.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
});
exports.getUserNotifications = getUserNotifications;
const markNotificationRead = (notificationId) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_client_js_1.default.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
});
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_client_js_1.default.notification.updateMany({
        where: {
            userId,
            read: false,
        },
        data: { read: true },
    });
});
exports.markAllNotificationsRead = markAllNotificationsRead;
