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
exports.initiateFuturaPayment = initiateFuturaPayment;
exports.verifyFuturaTransaction = verifyFuturaTransaction;
/**
 * Service d'intégration de paiement FuturaPay
 * Gère l'initiation et la vérification des transactions
 */
const config_js_1 = __importDefault(require("../config/config.js"));
const Futurapay = require("futurapay/futurapay");
const merchantKey = config_js_1.default.FUTURA_PAY_MERCHANT_KEY;
const siteId = config_js_1.default.FUTURA_PAY_SITE_ID;
const apiKey = config_js_1.default.FUTURA_PAY_API_KEY;
// Initialise un client Futurapay partagé
const paymentGateway = new Futurapay(merchantKey, apiKey, siteId);
// Choisir l'environnement (sandbox en dev)
paymentGateway.setEnv(process.env.NODE_ENV === "production" ? "live" : "sandbox");
// Type "withdraw" / "deposit" selon documentation (ici on utilise "withdraw")
paymentGateway.setType("withdraw");
/**
 * Génère l'URL sécurisée pour l'iframe de paiement FuturaPay.
 * Retourne la chaîne URL à ouvrir dans un iframe côté client.
 */
function initiateFuturaPayment(transactionData) {
    // La méthode de SDK documentée est initiatePayment
    // customer_transaction_id doit être unique (ici on attend l'id de réservation productForfait)
    const securedUrl = paymentGateway.initiatePayment(transactionData);
    return securedUrl;
}
/**
 * Vérification (placeholder) : selon le SDK / API FuturaPay vous devrez
 * appeler l'API de vérification ou traiter le webhook envoyé par FuturaPay.
 * Ici on laisse une fonction exportée à adapter avec l'API réelle.
 */
function verifyFuturaTransaction(customerTransactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: Implémenter l'appel de vérification si le SDK / API le permet.
        // Exemple (pseudo) : const status = await paymentGateway.verify(customerTransactionId);
        // Pour l'instant renvoyer UNKNOWN pour forcer l'usage du webhook / confirmation sécurisée.
        return { status: "UNKNOWN" };
    });
}
