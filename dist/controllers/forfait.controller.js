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
exports.confirmForfaitPayment = exports.initiateForfaitPayment = exports.deactivateForfait = exports.activateForfait = void 0;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const notification_service_js_1 = require("../services/notification.service.js");
const futurapay_service_js_1 = require("../services/futurapay.service.js");
/**
 * Activation d'un forfait sur un produit par l'administrateur
 */
const activateForfait = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId, forfaitType } = req.body;
    try {
        // Vérifier si le forfait existe
        const forfait = yield prisma_client_js_1.default.forfait.findFirst({
            where: { type: forfaitType },
        });
        if (!forfait)
            return response_js_1.default.notFound(res, "Forfait non trouvé", 404);
        // Vérifier si le produit existe
        const product = yield prisma_client_js_1.default.product.findUnique({
            where: { id: productId },
            include: { user: true },
        });
        if (!product)
            return response_js_1.default.notFound(res, "Produit non trouvé", 404);
        // Vérifier si le produit a déjà ce forfait actif
        const existingForfait = yield prisma_client_js_1.default.productForfait.findFirst({
            where: {
                productId,
                forfait: { type: forfaitType },
                isActive: true,
                expiresAt: { gt: new Date() },
            },
        });
        if (existingForfait) {
            return response_js_1.default.error(res, "Ce forfait est déjà actif sur ce produit", null, 400);
        }
        // Calculer la date d'expiration
        const now = new Date();
        const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);
        // Créer le forfait pour le produit
        yield prisma_client_js_1.default.productForfait.create({
            data: {
                productId,
                forfaitId: forfait.id,
                activatedAt: now,
                expiresAt,
                isActive: true,
            },
        });
        // Créer une notification pour l'utilisateur
        if ((_a = product.user) === null || _a === void 0 ? void 0 : _a.id) {
            yield (0, notification_service_js_1.createNotification)(product.user.id, `Forfait ${forfaitType} activé`, `Un forfait ${forfaitType} a été activé sur votre annonce "${product.name}".`, {
                type: "PRODUCT_FORFAIT",
                link: `/annonce/${productId}`,
            });
        }
        response_js_1.default.success(res, `Forfait ${forfaitType} activé sur le produit avec succès`, null);
    }
    catch (error) {
        console.error("Erreur lors de l'activation du forfait:", error);
        response_js_1.default.error(res, "Erreur lors de l'activation du forfait", error.message);
    }
});
exports.activateForfait = activateForfait;
/**
 * Désactivation d'un forfait sur un produit par l'administrateur
 */
const deactivateForfait = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId, forfaitType } = req.body;
    try {
        // Vérifier si le produit existe
        const product = yield prisma_client_js_1.default.product.findUnique({
            where: { id: productId },
            include: { user: true },
        });
        if (!product)
            return response_js_1.default.notFound(res, "Produit non trouvé", 404);
        // Trouver le forfait actif à désactiver
        const activeForfait = yield prisma_client_js_1.default.productForfait.findFirst({
            where: {
                productId,
                forfait: { type: forfaitType },
                isActive: true,
            },
            include: { forfait: true },
        });
        if (!activeForfait) {
            return response_js_1.default.error(res, "Aucun forfait actif de ce type trouvé sur ce produit", null, 404);
        }
        // Désactiver le forfait
        yield prisma_client_js_1.default.productForfait.update({
            where: { id: activeForfait.id },
            data: {
                isActive: false,
                deactivatedAt: new Date(),
            },
        });
        // Créer une notification pour l'utilisateur
        if ((_a = product.user) === null || _a === void 0 ? void 0 : _a.id) {
            yield (0, notification_service_js_1.createNotification)(product.user.id, `Forfait ${forfaitType} retiré`, `Le forfait ${forfaitType} a été retiré de votre annonce "${product.name}".`, {
                type: "PRODUCT_FORFAIT",
                link: `/annonce/${productId}`,
            });
        }
        response_js_1.default.success(res, `Forfait ${forfaitType} retiré du produit avec succès`, null);
    }
    catch (error) {
        console.error("Erreur lors de la désactivation du forfait:", error);
        response_js_1.default.error(res, "Erreur lors de la désactivation du forfait", error.message);
    }
});
exports.deactivateForfait = deactivateForfait;
//desacttivation de forfait
// Nouvel endpoint : initier le paiement pour un forfait (frontend affiche iframe avec l'URL)
const initiateForfaitPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { productId, forfaitType } = req.body;
    try {
        const forfait = yield prisma_client_js_1.default.forfait.findFirst({
            where: { type: forfaitType },
        });
        if (!forfait)
            return response_js_1.default.notFound(res, "Forfait non trouvé", 404);
        const product = yield prisma_client_js_1.default.product.findUnique({
            where: { id: productId },
            include: { user: true },
        });
        if (!product)
            return response_js_1.default.notFound(res, "Produit non trouvé", 404);
        // Créer réservation temporaire du forfait (isActive=false) — on active seulement après paiement
        const now = new Date();
        const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);
        const productForfait = yield prisma_client_js_1.default.productForfait.create({
            data: {
                productId,
                forfaitId: forfait.id,
                activatedAt: now,
                expiresAt,
                isActive: false, // en attente de paiement
            },
        });
        // Préparer les données de transaction — on passe productForfait.id comme customer_transaction_id
        const transactionData = {
            currency: "XAF",
            amount: forfait.price,
            customer_transaction_id: productForfait.id, // identifiant de la réservation
            country_code: "CM",
            customer_first_name: ((_a = product.user) === null || _a === void 0 ? void 0 : _a.firstName) || "Client",
            customer_last_name: ((_b = product.user) === null || _b === void 0 ? void 0 : _b.lastName) || "",
            customer_phone: product.telephone || "",
            customer_email: ((_c = product.user) === null || _c === void 0 ? void 0 : _c.email) || "",
            // vous pouvez ajouter d'autres champs si le SDK le supporte
        };
        const securedUrl = (0, futurapay_service_js_1.initiateFuturaPayment)(transactionData);
        // Retourner l'URL sécurisé au frontend (iframe) ainsi que l'id de la réservation
        return response_js_1.default.success(res, "Payment initiated", {
            url: securedUrl,
            productForfaitId: productForfait.id,
        });
    }
    catch (error) {
        console.error("Erreur initiation paiement forfait:", error);
        return response_js_1.default.error(res, "Erreur initiation paiement", error.message);
    }
});
exports.initiateForfaitPayment = initiateForfaitPayment;
// Endpoint de confirmation (webhook ou appel frontend après paiement)
// Attendre que FuturaPay envoie un webhook ou que frontend appelle cet endpoint avec le customer_transaction_id et status
const confirmForfaitPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { customer_transaction_id, status } = req.body;
    try {
        if (!customer_transaction_id)
            return response_js_1.default.error(res, "Transaction id requis", null, 400);
        const productForfait = yield prisma_client_js_1.default.productForfait.findUnique({
            where: { id: customer_transaction_id },
            include: { product: true, forfait: true },
        });
        if (!productForfait)
            return response_js_1.default.notFound(res, "Réservation de forfait introuvable", 404);
        // Vérifier l'état retourné par FuturaPay (adapter selon votre webhook)
        if (status === "SUCCESS" || status === "PAID") {
            // Activer le forfait
            yield prisma_client_js_1.default.productForfait.update({
                where: { id: productForfait.id },
                data: { isActive: true, activatedAt: new Date() },
            });
            // Notification utilisateur
            if ((_a = productForfait.product) === null || _a === void 0 ? void 0 : _a.userId) {
                yield (0, notification_service_js_1.createNotification)(productForfait.product.userId, `Forfait ${productForfait.forfait.type} activé`, `Votre forfait pour l'annonce "${productForfait.product.name}" a été activé après paiement.`, {
                    type: "PRODUCT_FORFAIT",
                    link: `/annonce/${productForfait.productId}`,
                });
            }
            return response_js_1.default.success(res, "Paiement confirmé et forfait activé", {
                productForfaitId: productForfait.id,
            });
        }
        // Paiement non réussi
        // Optionnel : supprimer la réservation si échec
        yield prisma_client_js_1.default.productForfait.delete({ where: { id: productForfait.id } });
        return response_js_1.default.error(res, "Paiement échoué ou annulé", null, 400);
    }
    catch (error) {
        console.error("Erreur confirmation paiement forfait:", error);
        return response_js_1.default.error(res, "Erreur confirmation paiement", error.message);
    }
});
exports.confirmForfaitPayment = confirmForfaitPayment;
