"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cache_controller_js_1 = require("../controllers/cache.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const router = express_1.default.Router();
/**
 * 📊 Routes de monitoring et gestion du cache
 * Accessible uniquement aux administrateurs
 */
// Statistiques du cache (lecture)
router.get('/stats', auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)('ADMIN_READ'), // Seuls les admins peuvent voir les stats
cache_controller_js_1.getCacheStats);
// Nettoyage sélectif du cache
router.post('/cleanup', auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)('ADMIN_WRITE'), // Requiert permissions d'écriture admin
cache_controller_js_1.cleanupCache);
// Vidage complet du cache (action critique)
router.delete('/flush', auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)('ADMIN_WRITE'), // Action sensible, réservée aux admins
cache_controller_js_1.flushCache);
exports.default = router;
