"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductTransformer = void 0;
const utils_js_1 = __importDefault(require("../helper/utils.js"));
/**
 * Service de transformation des produits
 * Centralise toute la logique de conversion pour les réponses API
 */
class ProductTransformer {
    /**
     * Transforme un produit unique avec images et métadonnées de base
     * @param req Request Express pour construire les URLs
     * @param product Produit brut de la base de données
     * @returns Produit transformé avec URLs d'images complètes
     */
    static transformProduct(req, product) {
        return Object.assign(Object.assign({}, product), { 
            // 🖼️ Conversion sécurisée des images en URLs complètes
            images: Array.isArray(product.images)
                ? product.images.map((imagePath) => utils_js_1.default.resolveFileUrl(req, imagePath))
                : [], 
            // 👁️ Assurer que viewCount est défini
            viewCount: product.viewCount || 0 });
    }
    /**
     * Transforme un produit avec forfaits actifs
     * @param req Request Express pour construire les URLs
     * @param product Produit avec données de forfaits
     * @returns Produit transformé avec forfaits formatés
     */
    static transformProductWithForfaits(req, product) {
        var _a;
        const baseTransformed = this.transformProduct(req, product);
        // 🎫 Priorités des forfaits pour le tri général (pages produits)
        // Ordre: PREMIUM > TOP_ANNONCE > A_LA_UNE > URGENT
        const forfaitPriority = {
            PREMIUM: 1, // 1. Premium (regroupe tous les forfaits)
            TOP_ANNONCE: 2, // 2. Top (en tête de liste)
            A_LA_UNE: 3, // 3. À la une
            URGENT: 4, // 4. Urgent (badge urgent)
        };
        return Object.assign(Object.assign({}, baseTransformed), { 
            // 🎯 Forfaits actifs avec priorités
            activeForfaits: ((_a = product.productForfaits) === null || _a === void 0 ? void 0 : _a.filter((pf) => pf.isActive && new Date(pf.expiresAt) > new Date()).map((pf) => ({
                type: pf.forfait.type,
                priority: forfaitPriority[pf.forfait.type],
                expiresAt: pf.expiresAt,
            }))) || [] });
    }
    /**
     * Transforme un tableau de produits
     * @param req Request Express pour construire les URLs
     * @param products Tableau de produits bruts
     * @returns Tableau de produits transformés
     */
    static transformProducts(req, products) {
        return products.map((product) => this.transformProduct(req, product));
    }
    /**
     * Transforme un tableau de produits avec forfaits
     * @param req Request Express pour construire les URLs
     * @param products Tableau de produits avec forfaits
     * @returns Tableau de produits transformés avec forfaits
     */
    static transformProductsWithForfaits(req, products) {
        return products.map((product) => this.transformProductWithForfaits(req, product));
    }
    /**
     * Transforme un produit avec stats utilisateur (pour getAllProducts)
     * @param req Request Express
     * @param product Produit avec stats utilisateur
     * @param userStats Stats de l'utilisateur propriétaire
     * @returns Produit transformé avec stats utilisateur
     */
    static transformProductWithUserStats(req, product, userStats) {
        const baseTransformed = this.transformProduct(req, product);
        return Object.assign(Object.assign({}, baseTransformed), { userTotalPoints: userStats.totalPoints, userAveragePoints: userStats.averagePoints });
    }
}
exports.ProductTransformer = ProductTransformer;
exports.default = ProductTransformer;
