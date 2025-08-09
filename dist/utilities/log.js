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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_client_1 = __importDefault(require("../model/prisma.client"));
class Log {
}
_a = Log;
/**
 * Enregistre une connexion utilisateur.
 * @param {string} userId - ID de l'utilisateur.
 * @param {string} ipAddress - Adresse IP de l'utilisateur.
 * @param {string} userAgent - Agent utilisateur (navigateur).
 */
Log.logConnection = (userId, ipAddress, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_client_1.default.connectionLog.create({
        data: {
            userId,
            ipAddress,
            userAgent,
        },
    });
});
/**
 * Récupère l'historique des connexions d'un utilisateur.
 * @param {string} userId - ID de l'utilisateur.
 * @returns {Array} - Liste des connexions.
 */
Log.getConnectionLogs = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_client_1.default.connectionLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
});
exports.default = Log;
