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
exports.getPendingProducts = exports.reviewProduct = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const utils_js_1 = __importDefault(require("../helper/utils.js"));
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    try {
        const where = {
            status: "VALIDATED",
        };
        if (search) {
            where.name = { contains: search, mode: "insensitive" };
        }
        const products = yield prisma_client_js_1.default.product.findMany({
            skip: offset,
            take: limit,
            orderBy: { createdAt: "desc" },
            where,
            include: {
                category: true,
                city: true,
                user: true, // On inclut l'utilisateur
            },
        });
        // Pour chaque produit, calculer la somme des points reçus par le user qui a posté le produit
        const productsWithUserPoints = yield Promise.all(products.map((product) => __awaiter(void 0, void 0, void 0, function* () {
            // On suppose que la table review a un champ userId qui correspond au propriétaire du produit
            const userReviews = yield prisma_client_js_1.default.review.findMany({
                where: { userId: product.userId },
            });
            const totalPoints = userReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
            const averagePoints = userReviews.length > 0 ? totalPoints / userReviews.length : null;
            return Object.assign(Object.assign({}, product), { userTotalPoints: totalPoints, userAveragePoints: averagePoints });
        })));
        const total = yield prisma_client_js_1.default.product.count({ where });
        response_js_1.default.success(res, "Products retrieved successfully!", {
            products: productsWithUserPoints,
            links: {
                perpage: limit,
                prevPage: page > 1 ? page - 1 : null,
                currentPage: page,
                nextPage: offset + limit < total ? page + 1 : null,
                totalPage: Math.ceil(total / limit),
                total: total,
            },
        });
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to get all products", error.message);
    }
});
exports.getAllProducts = getAllProducts;
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "id is not found", 422);
        }
        const result = yield prisma_client_js_1.default.product.findFirst({
            where: {
                id,
            },
        });
        if (!result) {
            return response_js_1.default.notFound(res, "Product not found", 404);
        }
        response_js_1.default.success(res, "Product retrieved successfully", result);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to get product by ID", error.message);
    }
});
exports.getProductById = getProductById;
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, price, quantity, description, categoryId, cityId, etat, quartier, telephone } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Validation basique
        if (!name ||
            !price ||
            !quantity ||
            !description ||
            !categoryId ||
            !cityId ||
            !etat) {
            return response_js_1.default.error(res, "Tous les champs sont requis", null, 400);
        }
        // Gestion des images (upload)
        if (!req.files || !req.files.images) {
            return response_js_1.default.error(res, "Au moins une image est requise", null, 400);
        }
        let images = req.files.images;
        if (!Array.isArray(images))
            images = [images];
        if (images.length < 1 || images.length > 5) {
            return response_js_1.default.error(res, "Un produit doit avoir entre 1 et 5 images", null, 400);
        }
        // Sauvegarde des images et récupération des chemins
        const savedImages = [];
        for (const img of images) {
            const savedPath = yield utils_js_1.default.saveFile(img, "products");
            savedImages.push(savedPath);
        }
        // Création du produit
        const product = yield prisma_client_js_1.default.product.create({
            data: {
                name,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                description,
                images: savedImages,
                categoryId,
                userId,
                cityId,
                status: "PENDING", // Statut par défaut
                etat,
                quartier,
                telephone,
            },
        });
        response_js_1.default.success(res, "Produit créé avec succès", product, 201);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Erreur lors de la création du produit", error.message);
    }
});
exports.createProduct = createProduct;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "id is not found", 422);
        }
        const existingProduct = yield prisma_client_js_1.default.product.findFirst({ where: { id } });
        if (!existingProduct) {
            return response_js_1.default.notFound(res, "Product not found", 404);
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
                yield utils_js_1.default.deleteFile(oldImg);
            }
            // Sauvegarder les nouvelles images
            images = [];
            for (const img of newImages) {
                const savedPath = yield utils_js_1.default.saveFile(img, "products");
                images.push(savedPath);
            }
        }
        const updatedProduct = yield prisma_client_js_1.default.product.update({
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
        response_js_1.default.success(res, "Produit mis à jour avec succès", updatedProduct);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Erreur lors de la mise à jour du produit", error.message);
    }
});
exports.updateProduct = updateProduct;
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "id is not found", 422);
        }
        const product = yield prisma_client_js_1.default.product.findUnique({ where: { id } });
        if (!product) {
            return response_js_1.default.notFound(res, "Product not found", 404);
        }
        // Supprimer les images associées
        if (product.images && Array.isArray(product.images)) {
            for (const img of product.images) {
                if (typeof img === "string") {
                    yield utils_js_1.default.deleteFile(img);
                }
            }
        }
        const result = yield prisma_client_js_1.default.product.delete({
            where: { id },
        });
        response_js_1.default.success(res, "Product deleted successfully", result);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to delete product", error.message);
    }
});
exports.deleteProduct = deleteProduct;
const reviewProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { action } = req.body;
    try {
        //verifie si le produit existe
        const product = yield prisma_client_js_1.default.product.findUnique({ where: { id } });
        if (!product) {
            return response_js_1.default.notFound(res, "Product not found", 404);
        }
        //verifie si l'action est valide
        if (action === 'validate') {
            yield prisma_client_js_1.default.product.update({
                where: { id },
                data: { status: 'VALIDATED' },
            });
            return response_js_1.default.success(res, "Product validated successfully", null);
        }
        else if (action === 'reject') {
            yield prisma_client_js_1.default.product.update({
                where: { id },
                data: { status: 'REJECTED' },
            });
            return response_js_1.default.success(res, "Product rejected successfully", null);
        }
        else {
            return response_js_1.default.error(res, "Invalid action", null, 400);
        }
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to review product", error.message);
    }
});
exports.reviewProduct = reviewProduct;
// pour voire tous les produits nouvellement creer avec un statut PENDING
const getPendingProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pendingProducts = yield prisma_client_js_1.default.product.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
        });
        response_js_1.default.success(res, "Pending products retrieved successfully", pendingProducts);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to retrieve pending products", error.message);
    }
});
exports.getPendingProducts = getPendingProducts;
