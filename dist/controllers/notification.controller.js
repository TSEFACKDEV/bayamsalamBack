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
exports.markAllAsRead = exports.markRead = exports.listNotifications = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const notification_service_js_1 = require("../services/notification.service.js");
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const listNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return response_js_1.default.error(res, "Unauthorized", null, 401);
        const notifs = yield (0, notification_service_js_1.getUserNotifications)(userId);
        return response_js_1.default.success(res, "Notifications fetched", notifs, 200);
    }
    catch (e) {
        return response_js_1.default.error(res, "Failed to fetch notifications", e.message, 500);
    }
});
exports.listNotifications = listNotifications;
const markRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const notif = yield (0, notification_service_js_1.markNotificationRead)(id);
        return response_js_1.default.success(res, "Notification marked read", notif, 200);
    }
    catch (e) {
        return response_js_1.default.error(res, "Failed to mark notification read", e.message, 500);
    }
});
exports.markRead = markRead;
const markAllAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return response_js_1.default.error(res, "Unauthorized", null, 401);
        yield (0, notification_service_js_1.markAllNotificationsRead)(userId);
        return response_js_1.default.success(res, "All notifications marked as read", null, 200);
    }
    catch (e) {
        return response_js_1.default.error(res, "Failed to mark all notifications as read", e.message, 500);
    }
});
exports.markAllAsRead = markAllAsRead;
const deleteOldNotifications = () => __awaiter(void 0, void 0, void 0, function* () {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const deleted = yield prisma_client_js_1.default.notification.deleteMany({
        where: {
            createdAt: {
                lt: fiveDaysAgo,
            },
        },
    });
    console.log(`Deleted ${deleted.count} notifications older than 5 days.`);
});
deleteOldNotifications()
    .catch((e) => {
    console.error(e);
})
    .finally(() => {
    prisma_client_js_1.default.$disconnect();
});
