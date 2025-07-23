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
import Utils from "../helper/utils.js";
export const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    try {
        const params = {
            skip: offset,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            where: !search
                ? undefined
                : {
                    name: { contains: search },
                },
        };
        const result = yield prisma.product.findMany(params);
        const total = yield prisma.product.count(params);
        ResponseApi.success(res, "product retrieved succesfully !!!", {
            products: result,
            links: {
                perpage: limit,
                prevPage: page - 1 ? page - 1 : null,
                currentPage: page,
                nextPage: page + 1 ? page + 1 : null,
                totalPage: limit ? Math.ceil(total / limit) : 1,
                total: total,
            },
        });
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "failled to getAll products", error.message);
    }
});
export const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "id is not found", 422);
        }
        const result = yield prisma.product.findFirst({
            where: {
                id,
            },
        });
        if (!result) {
            return ResponseApi.notFound(res, "Product not found", 404);
        }
        ResponseApi.success(res, "Product retrieved successfully", result);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failed to get product by ID", error.message);
    }
});
export const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, price, quantity, description, categoryId, userId, cityId } = req.body;
        // Validation basique
        if (!name ||
            !price ||
            !quantity ||
            !description ||
            !categoryId ||
            !userId ||
            !cityId) {
            return ResponseApi.error(res, "Tous les champs sont requis", null, 400);
        }
        // Gestion des images (upload)
        if (!req.files || !req.files.images) {
            return ResponseApi.error(res, "Au moins une image est requise", null, 400);
        }
        let images = req.files.images;
        if (!Array.isArray(images))
            images = [images];
        if (images.length < 1 || images.length > 5) {
            return ResponseApi.error(res, "Un produit doit avoir entre 1 et 5 images", null, 400);
        }
        // Sauvegarde des images et récupération des chemins
        const savedImages = [];
        for (const img of images) {
            const savedPath = yield Utils.saveFile(img, "products");
            savedImages.push(savedPath);
        }
        // Création du produit
        const product = yield prisma.product.create({
            data: {
                name,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                description,
                images: savedImages,
                categoryId,
                userId,
                cityId,
            },
        });
        ResponseApi.success(res, "Produit créé avec succès", product, 201);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Erreur lors de la création du produit", error.message);
    }
});
export const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "id is not found", 422);
        }
        const existingProduct = yield prisma.product.findUnique({ where: { id } });
        if (!existingProduct) {
            return ResponseApi.notFound(res, "Product not found", 404);
        }
        const { name, price, quantity, description, categoryId, userId, cityId } = req.body;
        // Gestion des images (upload)
        let images = existingProduct.images;
        if (req.files && req.files.images) {
            let newImages = req.files.images;
            if (!Array.isArray(newImages))
                newImages = [newImages];
            // Supprimer les anciennes images si besoin
            for (const oldImg of images) {
                yield Utils.deleteFile(oldImg);
            }
            // Sauvegarder les nouvelles images
            images = [];
            for (const img of newImages) {
                const savedPath = yield Utils.saveFile(img, "products");
                images.push(savedPath);
            }
        }
        const updatedProduct = yield prisma.product.update({
            where: { id },
            data: {
                name: name !== null && name !== void 0 ? name : existingProduct.name,
                price: price ? parseFloat(price) : existingProduct.price,
                quantity: quantity ? parseInt(quantity) : existingProduct.quantity,
                description: description !== null && description !== void 0 ? description : existingProduct.description,
                images,
                categoryId: categoryId !== null && categoryId !== void 0 ? categoryId : existingProduct.categoryId,
                userId: userId !== null && userId !== void 0 ? userId : existingProduct.userId,
                cityId: cityId !== null && cityId !== void 0 ? cityId : existingProduct.cityId,
            },
        });
        ResponseApi.success(res, "Produit mis à jour avec succès", updatedProduct);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Erreur lors de la mise à jour du produit", error.message);
    }
});
export const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "id is not found", 422);
        }
        const product = yield prisma.product.findUnique({ where: { id } });
        if (!product) {
            return ResponseApi.notFound(res, "Product not found", 404);
        }
        // Supprimer les images associées
        if (product.images && Array.isArray(product.images)) {
            for (const img of product.images) {
                if (typeof img === "string") {
                    yield Utils.deleteFile(img);
                }
            }
        }
        const result = yield prisma.product.delete({
            where: { id },
        });
        ResponseApi.success(res, "Product deleted successfully", result);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failed to delete product", error.message);
    }
});
