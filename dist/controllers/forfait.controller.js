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
exports.deactivateForfait = exports.activateForfait = exports.getProductForfaits = exports.getAllForfaits = void 0;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const notification_service_js_1 = require("../services/notification.service.js");
const cache_service_js_1 = require("../services/cache.service.js");
/**
 * Récupérer tous les forfaits disponibles
 */
const getAllForfaits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const forfaits = yield prisma_client_js_1.default.forfait.findMany({
            orderBy: { price: 'asc' },
            select: {
                id: true,
                type: true,
                price: true,
                duration: true,
                description: true,
            }
        });
        response_js_1.default.success(res, "Forfaits récupérés avec succès", forfaits);
    }
    catch (error) {
        console.error("Erreur lors de la récupération des forfaits:", error);
        response_js_1.default.error(res, "Erreur lors de la récupération des forfaits", error.message);
    }
});
exports.getAllForfaits = getAllForfaits;
/**
 * Récupérer les forfaits actifs d'un produit
 */
const getProductForfaits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId } = req.params;
    try {
        const productForfaits = yield prisma_client_js_1.default.productForfait.findMany({
            where: {
                productId,
                isActive: true,
                expiresAt: { gt: new Date() }
            },
            include: {
                forfait: {
                    select: {
                        id: true,
                        type: true,
                        price: true,
                        duration: true,
                        description: true,
                    }
                }
            },
            orderBy: { activatedAt: 'desc' }
        });
        response_js_1.default.success(res, "Forfaits du produit récupérés avec succès", {
            productId,
            forfaits: productForfaits.map(pf => ({
                id: pf.id,
                forfait: pf.forfait,
                activatedAt: pf.activatedAt,
                expiresAt: pf.expiresAt,
                isActive: pf.isActive
            }))
        });
    }
    catch (error) {
        console.error("Erreur lors de la récupération des forfaits du produit:", error);
        response_js_1.default.error(res, "Erreur lors de la récupération des forfaits du produit", error.message);
    }
});
exports.getProductForfaits = getProductForfaits;
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
        // Invalider le cache après activation forfait
        cache_service_js_1.cacheService.invalidateHomepageProducts();
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
        // Invalider le cache après désactivation forfait
        cache_service_js_1.cacheService.invalidateHomepageProducts();
        response_js_1.default.success(res, `Forfait ${forfaitType} retiré du produit avec succès`, null);
    }
    catch (error) {
        console.error("Erreur lors de la désactivation du forfait:", error);
        response_js_1.default.error(res, "Erreur lors de la désactivation du forfait", error.message);
    }
});
exports.deactivateForfait = deactivateForfait;
