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
exports.monetbilNotification = exports.payAndActivateForfait = exports.activateForfait = void 0;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const monetbil_helper_js_1 = require("../helper/monetbil.helper.js");
// Activation d'un forfait sur un produit (après paiement)
const activateForfait = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId, forfaitType } = req.body;
    try {
        const forfait = yield prisma_client_js_1.default.forfait.findFirst({ where: { type: forfaitType } });
        if (!forfait)
            return response_js_1.default.notFound(res, "Forfait non trouvé", 404);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);
        yield prisma_client_js_1.default.productForfait.create({
            data: {
                productId,
                forfaitId: forfait.id,
                activatedAt: now,
                expiresAt,
                isActive: true,
            },
        });
        response_js_1.default.success(res, "Forfait activé sur le produit", null);
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur activation forfait", error.message);
    }
});
exports.activateForfait = activateForfait;
// Activation d'un forfait avec paiement Monetbil
const payAndActivateForfait = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { productId, forfaitType, phonenumber, operator } = req.body;
    try {
        const forfait = yield prisma_client_js_1.default.forfait.findFirst({ where: { type: forfaitType } });
        if (!forfait)
            return response_js_1.default.notFound(res, "Forfait non trouvé", 404);
        // Lancer le paiement Monetbil
        const payment = yield (0, monetbil_helper_js_1.placePayment)({
            phonenumber,
            amount: forfait.price,
            notify_url: "https://tonserveur.com/monetbil/notifications",
            country: "CM",
            currency: "XAF",
            operator: operator || "CM_MTNMOBILEMONEY",
            item_ref: productId,
            payment_ref: `${productId}_${Date.now()}`,
            // Optionnel: infos utilisateur
            first_name: (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.firstName,
            last_name: (_b = req.authUser) === null || _b === void 0 ? void 0 : _b.lastName,
            email: (_c = req.authUser) === null || _c === void 0 ? void 0 : _c.email,
        });
        if (payment.status !== "REQUEST_ACCEPTED") {
            return response_js_1.default.error(res, "Paiement non accepté", payment.message, 400);
        }
        // Retourne l'URL de paiement ou l'ID pour suivi
        response_js_1.default.success(res, "Paiement lancé, en attente de validation", {
            paymentId: payment.paymentId,
            payment_url: payment.payment_url,
            channel_ussd: payment.channel_ussd,
            channel_name: payment.channel_name,
        });
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur paiement forfait", error.message);
        console.log('====================================');
        console.log(error);
        console.log('====================================');
    }
});
exports.payAndActivateForfait = payAndActivateForfait;
// Callback pour notifier le paiement (à appeler par Monetbil)
const monetbilNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paymentId, item_ref } = req.body;
    try {
        const paymentStatus = yield (0, monetbil_helper_js_1.checkPayment)(paymentId);
        if (paymentStatus.transaction &&
            paymentStatus.transaction.status === 1 // 1 = succès
        ) {
            // Activer le forfait sur le produit
            const productId = item_ref;
            const forfaitType = paymentStatus.transaction.item_ref; // ou récupère le type autrement
            const forfait = yield prisma_client_js_1.default.forfait.findFirst({ where: { type: forfaitType } });
            if (forfait) {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);
                yield prisma_client_js_1.default.productForfait.create({
                    data: {
                        productId,
                        forfaitId: forfait.id,
                        activatedAt: now,
                        expiresAt,
                        isActive: true,
                    },
                });
            }
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.monetbilNotification = monetbilNotification;
