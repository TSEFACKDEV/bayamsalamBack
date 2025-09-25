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
exports.campayWebhook = exports.getUserPayments = exports.checkPaymentStatus = exports.initiatePayment = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const payment_service_js_1 = require("../services/payment.service.js");
const cache_service_js_1 = require("../services/cache.service.js");
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const forfait_service_js_1 = require("../services/forfait.service.js"); // ✅ Import regex unifiée
// Initier un paiement de forfait
const initiatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id;
        const { productId, forfaitId, phoneNumber, paymentMethod } = req.body;
        if (!userId) {
            return response_js_1.default.error(res, 'Utilisateur non authentifié', null, 401);
        }
        // Validation des données
        if (!productId || !forfaitId || !phoneNumber || !paymentMethod) {
            return response_js_1.default.error(res, 'Tous les champs sont requis', null, 400);
        }
        if (!['MOBILE_MONEY', 'ORANGE_MONEY'].includes(paymentMethod)) {
            return response_js_1.default.error(res, 'Méthode de paiement non supportée', null, 400);
        }
        // ✅ VALIDATION UNIFIÉE du numéro de téléphone
        const cleanPhone = phoneNumber.replace(/\s+/g, '');
        if (!forfait_service_js_1.PHONE_REGEX.test(cleanPhone)) {
            return response_js_1.default.error(res, 'Numéro de téléphone invalide (format: 237XXXXXXXX ou XXXXXXXX)', null, 400);
        }
        const result = yield payment_service_js_1.paymentService.initiatePayment(userId, productId, forfaitId, cleanPhone, paymentMethod);
        response_js_1.default.success(res, 'Paiement initié avec succès', {
            paymentId: result.payment.id,
            amount: result.payment.amount,
            status: result.payment.status,
            campayReference: result.payment.campayReference,
            ussdCode: (_b = result.campayResponse) === null || _b === void 0 ? void 0 : _b.ussd_code,
            instructions: 'Composez le code USSD pour finaliser le paiement',
        });
    }
    catch (error) {
        response_js_1.default.error(res, 'Erreur lors de l\'initiation du paiement', error.message);
    }
});
exports.initiatePayment = initiatePayment;
// Vérifier le statut d'un paiement (méthode améliorée)
const checkPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { paymentId } = req.params;
        const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return response_js_1.default.error(res, 'Utilisateur non authentifié', null, 401);
        }
        const payment = yield payment_service_js_1.paymentService.checkPaymentStatus(paymentId);
        if (payment.userId !== userId) {
            return response_js_1.default.error(res, 'Accès non autorisé', null, 403);
        }
        // Invalider le cache si le paiement est réussi
        if (payment.status === 'SUCCESS') {
            cache_service_js_1.cacheService.invalidateHomepageProducts();
        }
        // Vérifier si le forfait a été activé
        let forfaitActivated = false;
        if (payment.status === 'SUCCESS') {
            const activeForfait = yield prisma_client_js_1.default.productForfait.findFirst({
                where: {
                    productId: payment.productId,
                    forfaitId: payment.forfaitId,
                    isActive: true,
                    expiresAt: { gt: new Date() }
                }
            });
            forfaitActivated = !!activeForfait;
        }
        response_js_1.default.success(res, 'Statut du paiement récupéré', {
            paymentId: payment.id,
            status: payment.status,
            amount: payment.amount,
            paidAt: payment.paidAt,
            forfaitActivated, // ✅ Nouvelle information
            forfait: payment.forfait,
            product: {
                id: payment.product.id,
                name: payment.product.name,
            },
        });
    }
    catch (error) {
        response_js_1.default.error(res, 'Erreur lors de la vérification du paiement', error.message);
    }
});
exports.checkPaymentStatus = checkPaymentStatus;
// Obtenir l'historique des paiements
const getUserPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (!userId) {
            return response_js_1.default.error(res, 'Utilisateur non authentifié', null, 401);
        }
        const result = yield payment_service_js_1.paymentService.getUserPayments(userId, page, limit);
        response_js_1.default.success(res, 'Historique des paiements récupéré', result);
    }
    catch (error) {
        response_js_1.default.error(res, 'Erreur lors de la récupération des paiements', error.message);
    }
});
exports.getUserPayments = getUserPayments;
// Webhook pour recevoir les notifications de Campay (amélioré)
const campayWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔔 Webhook Campay reçu:', req.body);
        const { reference, status, external_reference, operator_reference } = req.body;
        if (!external_reference) {
            return response_js_1.default.error(res, 'Référence externe manquante', null, 400);
        }
        // Mettre à jour le statut du paiement automatiquement
        const payment = yield payment_service_js_1.paymentService.checkPaymentStatus(external_reference);
        console.log(`✅ Webhook traité - Payment ${external_reference} status: ${payment.status}`);
        // Répondre rapidement à Campay
        response_js_1.default.success(res, 'Webhook traité avec succès', {
            paymentId: external_reference,
            status: payment.status
        });
    }
    catch (error) {
        console.error('❌ Erreur webhook Campay:', error);
        response_js_1.default.error(res, 'Erreur lors du traitement du webhook', error.message);
    }
});
exports.campayWebhook = campayWebhook;
