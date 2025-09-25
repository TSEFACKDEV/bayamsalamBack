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
exports.paymentService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_js_1 = __importDefault(require("../config/config.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const cache_service_js_1 = require("./cache.service.js");
const forfait_service_js_1 = require("./forfait.service.js"); // ✅ Import regex unifiée
class PaymentService {
    constructor() {
        this.token = null;
        this.tokenExpires = null;
    }
    // Obtenir un token d'authentification Campay
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (this.token && this.tokenExpires && new Date() < this.tokenExpires) {
                    return this.token;
                }
                const response = yield axios_1.default.post(`${config_js_1.default.campay_base_url}/token/`, {
                    username: config_js_1.default.campay_username,
                    password: config_js_1.default.campay_password,
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                this.token = response.data.token;
                this.tokenExpires = new Date(Date.now() + (response.data.expires_in * 1000));
                return this.token;
            }
            catch (error) {
                console.error('Erreur lors de l\'obtention du token Campay:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error('Impossible d\'obtenir le token de paiement');
            }
        });
    }
    // Initier un paiement
    initiatePayment(userId, productId, forfaitId, phoneNumber, paymentMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            console.log('💳 Début initiatePayment avec:', {
                userId,
                productId,
                forfaitId,
                phoneNumber: phoneNumber.substring(0, 6) + '***',
                paymentMethod
            });
            let payment = null;
            try {
                // Récupérer le forfait
                const forfait = yield prisma_client_js_1.default.forfait.findUnique({
                    where: { id: forfaitId },
                });
                if (!forfait) {
                    console.error('❌ Forfait non trouvé avec ID:', forfaitId);
                    throw new Error('Forfait non trouvé');
                }
                console.log('📦 Forfait récupéré:', {
                    id: forfait.id,
                    type: forfait.type,
                    price: forfait.price,
                    currency: 'XAF'
                });
                // 🔴 VALIDATION DU PRIX : Doit être >= 100 XAF pour Campay
                if (forfait.price < 100) {
                    console.error('❌ Prix du forfait trop faible:', forfait.price);
                    throw new Error(`Le prix minimum pour Campay est 100 XAF (prix actuel: ${forfait.price})`);
                }
                // Créer l'enregistrement de paiement AVANT l'appel Campay
                payment = yield prisma_client_js_1.default.payment.create({
                    data: {
                        userId,
                        productId,
                        forfaitId,
                        amount: forfait.price,
                        currency: 'XAF',
                        phoneNumber,
                        paymentMethod,
                        status: 'PENDING',
                    },
                });
                console.log('💾 Payment créé en base:', {
                    id: payment.id,
                    amount: payment.amount,
                    status: payment.status
                });
                // 🔴 VÉRIFICATION DE LA CONFIGURATION
                console.log('🔧 Configuration Campay:', {
                    base_url: config_js_1.default.campay_base_url,
                    username_length: (_a = config_js_1.default.campay_username) === null || _a === void 0 ? void 0 : _a.length,
                    password_length: (_b = config_js_1.default.campay_password) === null || _b === void 0 ? void 0 : _b.length,
                });
                // Obtenir le token
                console.log('🔐 Obtention du token...');
                const token = yield this.getToken();
                if (!token) {
                    throw new Error('Token Campay non obtenu');
                }
                console.log('✅ Token obtenu, longueur:', token.length);
                // ✅ VALIDATION UNIFIÉE DU NUMÉRO DE TÉLÉPHONE
                const cleanPhone = phoneNumber.replace(/\s+/g, '');
                if (!forfait_service_js_1.PHONE_REGEX.test(cleanPhone)) {
                    console.error('❌ Numéro de téléphone invalide:', cleanPhone);
                    throw new Error(`Numéro de téléphone invalide: ${cleanPhone}. Format attendu: 237XXXXXXXX ou XXXXXXXX pour le Cameroun`);
                }
                // Formatage pour Campay (toujours avec 237)
                let formattedPhone = cleanPhone;
                if (!formattedPhone.startsWith('237')) {
                    formattedPhone = '237' + formattedPhone;
                }
                console.log('📱 Numéros:', {
                    original: phoneNumber,
                    formatted: formattedPhone
                });
                // Préparer la requête de paiement
                const paymentData = {
                    amount: forfait.price.toString(), // 🔴 S'assurer que c'est une string
                    currency: 'XAF',
                    from: formattedPhone,
                    description: `Forfait ${forfait.type} - ${productId.substring(0, 8)}`,
                    external_reference: payment.id,
                };
                console.log('📤 Données finales à envoyer à Campay:', {
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                    from: paymentData.from,
                    description: paymentData.description,
                    external_reference: paymentData.external_reference
                });
                console.log('🚀 Envoi de la requête à Campay...');
                console.log('🔗 URL complète:', `${config_js_1.default.campay_base_url}/collect/`);
                // Effectuer la requête de paiement avec gestion d'erreur améliorée
                const campayResponse = yield axios_1.default.post(`${config_js_1.default.campay_base_url}/collect/`, paymentData, {
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 60000,
                    // 🔴 VALIDATION DE LA RÉPONSE
                    validateStatus: function (status) {
                        return status < 500; // Résoudre seulement les erreurs serveur
                    }
                });
                console.log('📨 Réponse Campay complète:', {
                    status: campayResponse.status,
                    statusText: campayResponse.statusText,
                    headers: Object.keys(campayResponse.headers),
                    data: campayResponse.data
                });
                // Vérifier le statut de la réponse
                if (campayResponse.status !== 200) {
                    console.error('❌ Campay a retourné un statut d\'erreur:', campayResponse.status);
                    throw new Error(`Campay error ${campayResponse.status}: ${JSON.stringify(campayResponse.data)}`);
                }
                // Mettre à jour le paiement avec la référence Campay
                const updatedPayment = yield prisma_client_js_1.default.payment.update({
                    where: { id: payment.id },
                    data: {
                        campayReference: campayResponse.data.reference,
                        campayOperator: campayResponse.data.operator,
                        campayStatus: campayResponse.data.status || 'PENDING',
                        campayTransactionId: campayResponse.data.operator_reference,
                        metadata: {
                            fullCampayResponse: campayResponse.data,
                            ussdCode: campayResponse.data.ussd_code,
                            timestamp: new Date().toISOString()
                        }
                    },
                });
                console.log('💾 Payment mis à jour avec succès');
                return {
                    payment: updatedPayment,
                    campayResponse: campayResponse.data,
                };
            }
            catch (error) {
                console.error('❌ Erreur COMPLÈTE dans initiatePayment:', {
                    name: error.name,
                    message: error.message,
                    // Axios error details
                    isAxiosError: error.isAxiosError,
                    status: (_c = error.response) === null || _c === void 0 ? void 0 : _c.status,
                    statusText: (_d = error.response) === null || _d === void 0 ? void 0 : _d.statusText,
                    responseData: (_e = error.response) === null || _e === void 0 ? void 0 : _e.data,
                    responseHeaders: ((_f = error.response) === null || _f === void 0 ? void 0 : _f.headers) ? Object.keys(error.response.headers) : null,
                    // Request details
                    requestUrl: (_g = error.config) === null || _g === void 0 ? void 0 : _g.url,
                    requestMethod: (_h = error.config) === null || _h === void 0 ? void 0 : _h.method,
                    requestData: (_j = error.config) === null || _j === void 0 ? void 0 : _j.data,
                    requestHeaders: ((_k = error.config) === null || _k === void 0 ? void 0 : _k.headers) ? Object.keys(error.config.headers) : null,
                    // Context
                    paymentId: payment === null || payment === void 0 ? void 0 : payment.id,
                    forfaitId,
                    phoneNumber: phoneNumber.substring(0, 6) + '***'
                });
                // Marquer le paiement comme échoué
                if (payment === null || payment === void 0 ? void 0 : payment.id) {
                    try {
                        yield prisma_client_js_1.default.payment.update({
                            where: { id: payment.id },
                            data: {
                                status: 'FAILED',
                                errorMessage: error.message,
                                errorDetails: JSON.stringify({
                                    httpStatus: (_l = error.response) === null || _l === void 0 ? void 0 : _l.status,
                                    httpData: (_m = error.response) === null || _m === void 0 ? void 0 : _m.data,
                                    timestamp: new Date().toISOString()
                                })
                            },
                        });
                    }
                    catch (updateError) {
                        console.error('❌ Erreur lors de la mise à jour du payment:', updateError);
                    }
                }
                // Rethrow avec tous les détails
                const enrichedError = new Error(error.message);
                enrichedError.response = error.response;
                enrichedError.config = error.config;
                enrichedError.isAxiosError = error.isAxiosError;
                throw enrichedError;
            }
        });
    }
    // Vérifier le statut d'un paiement (méthode améliorée)
    checkPaymentStatus(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payment = yield prisma_client_js_1.default.payment.findUnique({
                    where: { id: paymentId },
                    include: { forfait: true, product: true, user: true }
                });
                if (!payment || !payment.campayReference) {
                    throw new Error('Paiement introuvable');
                }
                const token = yield this.getToken();
                const response = yield axios_1.default.get(`${config_js_1.default.campay_base_url}/transaction/${payment.campayReference}/`, {
                    headers: {
                        'Authorization': `Token ${token}`,
                    },
                });
                const campayStatus = response.data.status;
                let newStatus = payment.status;
                // Mapper les statuts Campay vers nos statuts
                switch (campayStatus) {
                    case 'SUCCESSFUL':
                        newStatus = 'SUCCESS';
                        break;
                    case 'FAILED':
                        newStatus = 'FAILED';
                        break;
                    case 'PENDING':
                        newStatus = 'PENDING';
                        break;
                    default:
                        newStatus = 'FAILED';
                }
                // Mettre à jour le statut si nécessaire
                if (newStatus !== payment.status) {
                    const updatedPayment = yield prisma_client_js_1.default.payment.update({
                        where: { id: paymentId },
                        data: {
                            status: newStatus,
                            paidAt: newStatus === 'SUCCESS' ? new Date() : payment.paidAt,
                            failureReason: newStatus === 'FAILED' ? response.data.reason : null,
                            campayStatus: campayStatus,
                            metadata: Object.assign(Object.assign({}, payment.metadata), { lastStatusCheck: new Date().toISOString(), campayResponse: response.data }),
                        },
                        include: { forfait: true, product: true, user: true }
                    });
                    // ✅ AUTOMATISATION : Si le paiement est réussi, activer le forfait IMMÉDIATEMENT
                    if (newStatus === 'SUCCESS') {
                        console.log('💳 Paiement réussi détecté, activation automatique du forfait...');
                        yield this.activateForfaitAfterPayment(updatedPayment);
                    }
                    return updatedPayment;
                }
                return payment;
            }
            catch (error) {
                console.error('Erreur lors de la vérification du paiement:', error);
                throw new Error('Erreur lors de la vérification du paiement');
            }
        });
    }
    // Activer le forfait après paiement réussi (méthode améliorée)
    activateForfaitAfterPayment(payment) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🎯 Début activation forfait pour payment:', payment.id);
                // Vérifier si le forfait n'est pas déjà activé pour éviter les doublons
                const existingForfait = yield prisma_client_js_1.default.productForfait.findFirst({
                    where: {
                        productId: payment.productId,
                        forfaitId: payment.forfaitId,
                        isActive: true,
                        expiresAt: { gt: new Date() }
                    }
                });
                if (existingForfait) {
                    console.log('⚠️ Forfait déjà actif, ignoré');
                    return;
                }
                const now = new Date();
                const expiresAt = new Date(now.getTime() + payment.forfait.duration * 24 * 60 * 60 * 1000);
                // Utiliser une transaction pour garantir la cohérence
                yield prisma_client_js_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    // 1. Créer le forfait produit
                    yield tx.productForfait.create({
                        data: {
                            productId: payment.productId,
                            forfaitId: payment.forfaitId,
                            activatedAt: now,
                            expiresAt,
                            isActive: true,
                        },
                    });
                    // 2. Créer une notification pour l'utilisateur
                    yield tx.notification.create({
                        data: {
                            userId: payment.userId,
                            title: `Forfait ${payment.forfait.type} activé`,
                            message: `Votre forfait ${payment.forfait.type} a été activé avec succès sur "${payment.product.name}". Il expire le ${expiresAt.toLocaleDateString('fr-FR')}.`,
                            type: 'PAYMENT_SUCCESS',
                            data: {
                                productId: payment.productId,
                                forfaitType: payment.forfait.type,
                                expiresAt: expiresAt.toISOString(),
                                paymentId: payment.id
                            },
                            link: `/product/${payment.productId}`,
                        },
                    });
                }));
                console.log('✅ Forfait activé avec succès');
                // Invalider le cache après activation du forfait
                cache_service_js_1.cacheService.invalidateHomepageProducts();
            }
            catch (error) {
                console.error('❌ Erreur lors de l\'activation du forfait:', error);
                throw error;
            }
        });
    }
    // Obtenir l'historique des paiements d'un utilisateur
    getUserPayments(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 10) {
            try {
                const offset = (page - 1) * limit;
                const [payments, totalCount] = yield Promise.all([
                    prisma_client_js_1.default.payment.findMany({
                        where: { userId },
                        skip: offset,
                        take: limit,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            forfait: true,
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    images: true,
                                },
                            },
                        },
                    }),
                    prisma_client_js_1.default.payment.count({ where: { userId } })
                ]);
                return {
                    payments,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(totalCount / limit),
                        total: totalCount,
                        perPage: limit,
                    },
                };
            }
            catch (error) {
                console.error('Erreur lors de la récupération des paiements:', error);
                throw new Error('Erreur lors de la récupération des paiements');
            }
        });
    }
}
exports.paymentService = new PaymentService();
