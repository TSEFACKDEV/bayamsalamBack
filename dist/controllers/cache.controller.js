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
exports.cleanupCache = exports.flushCache = exports.getCacheStats = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const cache_service_js_1 = require("../services/cache.service.js");
/**
 * 📊 Contrôleur pour la gestion et le monitoring du cache
 */
/**
 * GET /api/cache/stats
 * Récupère les statistiques détaillées du cache
 */
const getCacheStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = cache_service_js_1.cacheService.getStats();
        response_js_1.default.success(res, 'Statistiques du cache récupérées', Object.assign(Object.assign({}, stats), { hitRate: `${stats.hitRate}%`, memoryUsage: `${(stats.vsize / 1024).toFixed(2)} KB`, efficiency: stats.hitRateNumeric > 70
                ? 'Excellent'
                : stats.hitRateNumeric > 50
                    ? 'Bon'
                    : 'À améliorer' }));
    }
    catch (error) {
        response_js_1.default.error(res, 'Erreur lors de la récupération des statistiques du cache', error.message);
    }
});
exports.getCacheStats = getCacheStats;
/**
 * DELETE /api/cache/flush
 * Vide complètement le cache
 */
const flushCache = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        cache_service_js_1.cacheService.flush();
        response_js_1.default.success(res, 'Cache vidé avec succès', null);
    }
    catch (error) {
        response_js_1.default.error(res, 'Erreur lors du vidage du cache', error.message);
    }
});
exports.flushCache = flushCache;
/**
 * POST /api/cache/cleanup
 * Nettoie les entrées expirées du cache
 */
const cleanupCache = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedCount = cache_service_js_1.cacheService.cleanupExpired();
        response_js_1.default.success(res, 'Nettoyage du cache effectué', {
            deletedEntries: deletedCount,
        });
    }
    catch (error) {
        response_js_1.default.error(res, 'Erreur lors du nettoyage du cache', error.message);
    }
});
exports.cleanupCache = cleanupCache;
