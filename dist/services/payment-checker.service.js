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
exports.paymentCheckerService = void 0;
const payment_service_js_1 = require("./payment.service.js");
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
class PaymentCheckerService {
    constructor() {
        this.isRunning = false;
    }
    ensureDatabaseConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma_client_js_1.default.$connect();
            }
            catch (error) {
                console.error('❌ Erreur de reconnexion à la base de données:', error);
                throw error;
            }
        });
    }
    // Vérifier automatiquement les paiements en attente
    checkPendingPayments() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log('🔄 Vérification déjà en cours, ignoré');
                return;
            }
            this.isRunning = true;
            console.log('🔍 Début de la vérification des paiements en attente...');
            try {
                // 🔗 Vérifier la connexion avant la requête
                yield this.ensureDatabaseConnection();
                // Récupérer tous les paiements en attente créés dans les dernières 24h
                const pendingPayments = yield prisma_client_js_1.default.payment.findMany({
                    where: {
                        status: 'PENDING',
                        campayReference: { not: null },
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h
                        }
                    },
                    include: {
                        forfait: true,
                        product: true,
                        user: true
                    }
                });
                console.log(`📊 ${pendingPayments.length} paiements en attente trouvés`);
                // Vérifier chaque paiement
                for (const payment of pendingPayments) {
                    try {
                        console.log(`🔍 Vérification du paiement: ${payment.id}`);
                        yield payment_service_js_1.paymentService.checkPaymentStatus(payment.id);
                        // Petit délai pour éviter de surcharger l'API Campay
                        yield new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    catch (error) {
                        console.error(`❌ Erreur lors de la vérification du paiement ${payment.id}:`, error.message);
                    }
                }
                console.log('✅ Vérification des paiements terminée');
            }
            catch (error) {
                console.error('❌ Erreur générale lors de la vérification:', error);
            }
            finally {
                this.isRunning = false;
            }
        });
    }
    // Démarrer la vérification périodique
    startPeriodicCheck(intervalMinutes = 5) {
        console.log(`🕐 Démarrage de la vérification automatique (toutes les ${intervalMinutes} minutes)`);
        // Vérification immédiate
        this.checkPendingPayments();
        // Puis vérification périodique
        setInterval(() => {
            this.checkPendingPayments();
        }, intervalMinutes * 60 * 1000);
    }
    // Nettoyer les anciens paiements expirés
    cleanupExpiredPayments() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const expiredPayments = yield prisma_client_js_1.default.payment.updateMany({
                    where: {
                        status: 'PENDING',
                        createdAt: {
                            lt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48h
                        }
                    },
                    data: {
                        status: 'EXPIRED',
                        failureReason: 'Paiement expiré après 48 heures'
                    }
                });
                console.log(`🧹 ${expiredPayments.count} paiements expirés nettoyés`);
            }
            catch (error) {
                console.error('❌ Erreur lors du nettoyage:', error);
            }
        });
    }
}
exports.paymentCheckerService = new PaymentCheckerService();
