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
exports.PHONE_REGEX = void 0;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const client_1 = require("@prisma/client");
const payment_service_js_1 = require("./payment.service.js");
// ✅ REGEX UNIFIÉE pour les numéros de téléphone camerounais
exports.PHONE_REGEX = /^(237)?[26][0-9]{8}$/;
class ForfaitService {
    // ✅ MÉTHODE UNIFIÉE - Récupérer un forfait par son type
    static getForfaitByType(forfaitType) {
        return __awaiter(this, void 0, void 0, function* () {
            // Valider que le forfaitType est valide
            if (!Object.values(client_1.ForfaitType).includes(forfaitType)) {
                throw new Error(`Type de forfait invalide: ${forfaitType}. Types acceptés: ${Object.values(client_1.ForfaitType).join(', ')}`);
            }
            const forfait = yield prisma_client_js_1.default.forfait.findFirst({
                where: { type: forfaitType }
            });
            if (!forfait) {
                throw new Error(`Forfait de type ${forfaitType} non trouvé`);
            }
            return forfait;
        });
    }
    // ✅ MÉTHODE UNIFIÉE - Valider les données de paiement
    static validatePaymentData(phoneNumber, paymentMethod) {
        // Validation du numéro de téléphone
        const cleanPhone = phoneNumber.replace(/\s+/g, '');
        if (!exports.PHONE_REGEX.test(cleanPhone)) {
            return {
                isValid: false,
                error: 'Numéro de téléphone invalide (format: 237XXXXXXXX ou XXXXXXXX pour le Cameroun)'
            };
        }
        // Validation de la méthode de paiement
        if (!['MOBILE_MONEY', 'ORANGE_MONEY'].includes(paymentMethod)) {
            return {
                isValid: false,
                error: 'Méthode de paiement non supportée. Utilisez MOBILE_MONEY ou ORANGE_MONEY'
            };
        }
        return { isValid: true, cleanPhone };
    }
    // ✅ MÉTHODE UNIFIÉE - Traiter un paiement de forfait (CREATE/UPDATE)
    static handleForfaitPayment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { productId, userId, forfaitType, phoneNumber, paymentMethod } = data;
                // Validation des données
                const validation = this.validatePaymentData(phoneNumber, paymentMethod);
                if (!validation.isValid) {
                    return {
                        success: false,
                        error: {
                            error: true,
                            message: validation.error
                        }
                    };
                }
                // Récupérer le forfait
                const forfait = yield this.getForfaitByType(forfaitType);
                // Vérifier si le forfait n'est pas déjà actif
                const isAlreadyActive = yield this.isForfaitActive(productId, forfait.id);
                if (isAlreadyActive) {
                    return {
                        success: false,
                        error: {
                            error: true,
                            message: `Le forfait ${forfaitType} est déjà actif sur ce produit`
                        }
                    };
                }
                // Initier le paiement
                const paymentResult = yield payment_service_js_1.paymentService.initiatePayment(userId, productId, forfait.id, validation.cleanPhone, paymentMethod);
                return {
                    success: true,
                    payment: {
                        paymentId: paymentResult.payment.id,
                        amount: paymentResult.payment.amount,
                        campayReference: paymentResult.payment.campayReference,
                        ussdCode: (_a = paymentResult.campayResponse) === null || _a === void 0 ? void 0 : _a.ussd_code,
                        status: 'PENDING',
                        instructions: 'Composez le code USSD pour finaliser le paiement. Le forfait sera activé automatiquement après paiement.',
                        forfait: {
                            id: forfait.id,
                            type: forfait.type,
                            price: forfait.price,
                            duration: forfait.duration
                        }
                    }
                };
            }
            catch (error) {
                console.error('❌ Erreur lors du traitement du forfait:', error);
                return {
                    success: false,
                    error: {
                        error: true,
                        message: error.message || 'Erreur lors de l\'initiation du paiement'
                    }
                };
            }
        });
    }
    // Vérifier si un forfait est déjà actif
    static isForfaitActive(productId, forfaitId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingForfait = yield prisma_client_js_1.default.productForfait.findFirst({
                where: {
                    productId,
                    forfaitId,
                    isActive: true,
                    expiresAt: { gt: new Date() }
                }
            });
            return !!existingForfait;
        });
    }
    // Calculer la date d'expiration
    static calculateExpirationDate(duration) {
        const now = new Date();
        return new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    }
    // ✅ BONUS : Méthode pour valider les types de forfait
    static isValidForfaitType(type) {
        return Object.values(client_1.ForfaitType).includes(type);
    }
    // ✅ BONUS : Récupérer tous les types valides
    static getValidForfaitTypes() {
        return Object.values(client_1.ForfaitType);
    }
}
exports.default = ForfaitService;
