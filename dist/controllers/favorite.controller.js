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
exports.getUserFavorites = exports.removeFromFavorites = exports.addToFavorites = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const addToFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { productId } = req.body;
        if (!userId || !productId) {
            return response_js_1.default.error(res, "userId et productId sont requis", null, 400);
        }
        // Vérifie si le produit existe
        const product = yield prisma_client_js_1.default.product.findUnique({ where: { id: productId } });
        if (!product) {
            return response_js_1.default.notFound(res, "Produit introuvable", 404);
        }
        // Vérifie si déjà en favoris
        const existing = yield prisma_client_js_1.default.favorite.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (existing) {
            return response_js_1.default.error(res, "Produit déjà dans les favoris", null, 400);
        }
        const favorite = yield prisma_client_js_1.default.favorite.create({
            data: { userId, productId },
        });
        response_js_1.default.success(res, "Produit ajouté aux favoris", favorite, 201);
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de l'ajout aux favoris", error.message);
    }
});
exports.addToFavorites = addToFavorites;
const removeFromFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { productId } = req.body;
        if (!userId || !productId) {
            return response_js_1.default.error(res, "userId et productId sont requis", null, 400);
        }
        // Vérifie si le produit est en favoris
        const favorite = yield prisma_client_js_1.default.favorite.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (!favorite) {
            return response_js_1.default.notFound(res, "Produit non trouvé dans les favoris", 404);
        }
        yield prisma_client_js_1.default.favorite.delete({
            where: { userId_productId: { userId, productId } },
        });
        response_js_1.default.success(res, "Produit retiré des favoris", null, 200);
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors du retrait des favoris", error.message);
    }
});
exports.removeFromFavorites = removeFromFavorites;
const getUserFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return response_js_1.default.error(res, "userId requis", null, 400);
        }
        const favorites = yield prisma_client_js_1.default.favorite.findMany({
            where: { userId },
            include: { product: true }, // Inclut les infos du produit
        });
        response_js_1.default.success(res, "Favoris récupérés avec succès", favorites, 200);
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de la récupération des favoris", error.message);
    }
});
exports.getUserFavorites = getUserFavorites;
// ...existing code...
