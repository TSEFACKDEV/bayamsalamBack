var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
export const addToFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { productId } = req.body;
        if (!userId || !productId) {
            return ResponseApi.error(res, "userId et productId sont requis", null, 400);
        }
        // Vérifie si le produit existe
        const product = yield prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return ResponseApi.notFound(res, "Produit introuvable", 404);
        }
        // Vérifie si déjà en favoris
        const existing = yield prisma.favorite.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (existing) {
            return ResponseApi.error(res, "Produit déjà dans les favoris", null, 400);
        }
        const favorite = yield prisma.favorite.create({
            data: { userId, productId },
        });
        ResponseApi.success(res, "Produit ajouté aux favoris", favorite, 201);
    }
    catch (error) {
        ResponseApi.error(res, "Erreur lors de l'ajout aux favoris", error.message);
    }
});
export const removeFromFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { productId } = req.body;
        if (!userId || !productId) {
            return ResponseApi.error(res, "userId et productId sont requis", null, 400);
        }
        // Vérifie si le produit est en favoris
        const favorite = yield prisma.favorite.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (!favorite) {
            return ResponseApi.notFound(res, "Produit non trouvé dans les favoris", 404);
        }
        yield prisma.favorite.delete({
            where: { userId_productId: { userId, productId } },
        });
        ResponseApi.success(res, "Produit retiré des favoris", null, 200);
    }
    catch (error) {
        ResponseApi.error(res, "Erreur lors du retrait des favoris", error.message);
    }
});
