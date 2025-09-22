"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ForfaitSchedulerService = void 0;
const cron = __importStar(require("node-cron"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const notification_service_js_1 = require("./notification.service.js");
const cache_service_js_1 = require("./cache.service.js");
/**
 * Service simple pour la gestion automatique des forfaits
 * - Vérification quotidienne des forfaits qui expirent dans 24h (avertissement)
 * - Notification et nettoyage des forfaits expirés
 */
class ForfaitSchedulerService {
    /**
     * Démarre le service de surveillance des forfaits
     * Exécute une vérification quotidienne à minuit
     */
    static start() {
        console.log("🚀 ForfaitScheduler: Démarrage du service de surveillance des forfaits");
        // Cron job quotidien à minuit (0 0 * * *)
        cron.schedule("0 0 * * *", () => __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log("⚠️ ForfaitScheduler: Vérification déjà en cours, passage ignoré");
                return;
            }
            this.isRunning = true;
            console.log("🔍 ForfaitScheduler: Début de la vérification quotidienne des forfaits");
            try {
                yield this.checkForfaitsExpiration();
                console.log("✅ ForfaitScheduler: Vérification quotidienne terminée avec succès");
            }
            catch (error) {
                console.error("❌ ForfaitScheduler: Erreur lors de la vérification:", error);
            }
            finally {
                this.isRunning = false;
            }
        }));
        console.log("⏰ ForfaitScheduler: Cron job quotidien configuré (minuit)");
    }
    /**
     * Vérification principale des forfaits
     * 1. Avertissement pour forfaits qui expirent dans 24h
     * 2. Notification + nettoyage pour forfaits expirés
     */
    static checkForfaitsExpiration() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            // 1️⃣ AVERTISSEMENT: Forfaits qui expirent dans 24h
            yield this.notifyExpiringSoon(now, tomorrow);
            // 2️⃣ EXPIRATION: Forfaits déjà expirés
            yield this.handleExpiredForfaits(now);
            // 3️⃣ CACHE: Invalider le cache après modifications
            cache_service_js_1.cacheService.invalidateHomepageProducts();
        });
    }
    /**
     * Notifie les utilisateurs dont les forfaits expirent dans 24h
     */
    static notifyExpiringSoon(now, tomorrow) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const expiringSoonForfaits = yield prisma_client_js_1.default.productForfait.findMany({
                    where: {
                        isActive: true,
                        expiresAt: {
                            gt: now, // Pas encore expiré
                            lte: tomorrow, // Expire dans les 24h
                        },
                    },
                    include: {
                        product: {
                            include: { user: true },
                        },
                        forfait: true,
                    },
                });
                console.log(`📢 ForfaitScheduler: ${expiringSoonForfaits.length} forfait(s) expirent dans 24h`);
                for (const productForfait of expiringSoonForfaits) {
                    if ((_b = (_a = productForfait.product) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id) {
                        yield (0, notification_service_js_1.createNotification)(productForfait.product.user.id, "⏰ Forfait expire bientôt", `Votre forfait ${productForfait.forfait.type} pour l'annonce "${productForfait.product.name}" expire demain.`, {
                            type: "PRODUCT_FORFAIT",
                            link: `/annonce/${productForfait.productId}`,
                        });
                    }
                }
            }
            catch (error) {
                console.error("❌ ForfaitScheduler: Erreur lors des notifications d'expiration prochaine:", error);
            }
        });
    }
    /**
     * Gère les forfaits expirés : notification + nettoyage
     */
    static handleExpiredForfaits(now) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const expiredForfaits = yield prisma_client_js_1.default.productForfait.findMany({
                    where: {
                        isActive: true,
                        expiresAt: {
                            lte: now, // Déjà expiré
                        },
                    },
                    include: {
                        product: {
                            include: { user: true },
                        },
                        forfait: true,
                    },
                });
                console.log(`🔄 ForfaitScheduler: ${expiredForfaits.length} forfait(s) expirés à nettoyer`);
                for (const productForfait of expiredForfaits) {
                    // Notifier l'utilisateur de l'expiration
                    if ((_b = (_a = productForfait.product) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id) {
                        yield (0, notification_service_js_1.createNotification)(productForfait.product.user.id, "⚠️ Forfait expiré", `Votre forfait ${productForfait.forfait.type} pour l'annonce "${productForfait.product.name}" a expiré.`, {
                            type: "PRODUCT_FORFAIT",
                            link: `/annonce/${productForfait.productId}`,
                        });
                    }
                    // Désactiver le forfait expiré
                    yield prisma_client_js_1.default.productForfait.update({
                        where: { id: productForfait.id },
                        data: {
                            isActive: false,
                            deactivatedAt: now,
                        },
                    });
                }
            }
            catch (error) {
                console.error("❌ ForfaitScheduler: Erreur lors du nettoyage des forfaits expirés:", error);
            }
        });
    }
    /**
     * Méthode pour tests ou exécution manuelle
     */
    static runManualCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log("⚠️ ForfaitScheduler: Vérification déjà en cours");
                return;
            }
            this.isRunning = true;
            console.log("🔧 ForfaitScheduler: Exécution manuelle de la vérification");
            try {
                yield this.checkForfaitsExpiration();
                console.log("✅ ForfaitScheduler: Vérification manuelle terminée");
            }
            catch (error) {
                console.error("❌ ForfaitScheduler: Erreur lors de la vérification manuelle:", error);
                throw error;
            }
            finally {
                this.isRunning = false;
            }
        });
    }
}
exports.ForfaitSchedulerService = ForfaitSchedulerService;
ForfaitSchedulerService.isRunning = false;
