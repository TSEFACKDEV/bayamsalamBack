var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";
import { handleProductImagesUpload, deleteProductImages } from "../utilities/upload.js";
export const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    try {
        const products = yield prisma.product.findMany({
            where: {
                name: {
                    contains: search,
                },
            },
            skip: skip,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                category: true,
            },
        });
        const totalProducts = yield prisma.product.count({
            where: {
                name: {
                    contains: search,
                },
            },
        });
        const totalPages = Math.ceil(totalProducts / limit);
        ResponseApi.success(res, "Products retrieved successfully", {
            products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: page,
                limit,
            },
        });
    }
    catch (error) {
        console.error("Error in getAllProducts:", error);
        res
            .status(500)
            .json({ message: "An error occurred while fetching products" });
    }
});
export const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        // Vérifier si l'ID est valide
        if (!id) {
            return ResponseApi.notFound(res, "Product ID is required");
        }
        // Récupérer le produit par ID
        const product = yield prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
            },
        });
        // Vérifier si le produit existe
        if (!product) {
            return ResponseApi.notFound(res, "Product not found");
        }
        ResponseApi.success(res, "Product retrieved successfully", product);
    }
    catch (error) {
        console.error("Error in getProductById:", error);
        ResponseApi.error(res, "An error occurred while fetching the product", 500);
    }
});
export const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { name, description, price, categoryId, cityId, quantity } = req.body;
    const files = (_a = req.files) === null || _a === void 0 ? void 0 : _a.images;
    try {
        // 1. Vérification des champs requis
        if (!name || !description || !price || !categoryId || !cityId || !quantity) {
            return ResponseApi.notFound(res, "All fields are required");
        }
        // 2. Vérification de l'utilisateur (méthode alternative plus robuste)
        const userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || req.headers['x-user-id'];
        if (!userId) {
            return ResponseApi.notFound(res, "User authentication required");
        }
        // 3. Vérification des images
        if (!files) {
            return ResponseApi.error(res, "A product must have between 1 and 5 images", 400);
        }
        // 4. Gestion des fichiers
        const imagesArray = Array.isArray(files) ? files : [files];
        if (imagesArray.length < 1 || imagesArray.length > 5) {
            return ResponseApi.error(res, "A product must have between 1 and 5 images", 400);
        }
        // 5. Conversion des types
        const priceNumber = parseFloat(price);
        const quantityInt = parseInt(quantity);
        // 6. Upload des images
        const images = yield handleProductImagesUpload(imagesArray);
        // 7. Vérification que l'utilisateur existe
        const userExists = yield prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userExists) {
            // Supprimer les images uploadées si l'utilisateur n'existe pas
            yield deleteProductImages(images);
            return ResponseApi.notFound(res, "User not found");
        }
        // 8. Création du produit
        const newProduct = yield prisma.product.create({
            data: {
                name,
                description,
                price: priceNumber,
                quantity: quantityInt,
                category: {
                    connect: { id: categoryId }
                },
                city: {
                    connect: { id: cityId }
                },
                images,
                user: {
                    connect: { id: userId }
                }
            },
            include: {
                category: true,
                city: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        ResponseApi.success(res, "Product created successfully", newProduct, 201);
    }
    catch (error) {
        console.error("Error in createProduct:", error);
        // Supprimer les images en cas d'erreur
        if ((_c = req.files) === null || _c === void 0 ? void 0 : _c.images) {
            const imagesArray = Array.isArray(req.files.images)
                ? req.files.images
                : [req.files.images];
            const images = imagesArray.map(f => `/uploads/products/${f.filename}`);
            yield deleteProductImages(images);
        }
        ResponseApi.error(res, "An error occurred while creating the product", error.message);
    }
});
export const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = req.params.id;
    const { name, description, price, categoryId, cityId, quantity } = req.body;
    const files = (_a = req.files) === null || _a === void 0 ? void 0 : _a.images;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "Product ID is required");
        }
        const existingProduct = yield prisma.product.findUnique({
            where: { id },
        });
        if (!existingProduct) {
            return ResponseApi.notFound(res, "Product not found");
        }
        let images;
        if (files) {
            const imagesArray = Array.isArray(files) ? files : [files];
            if (imagesArray.length < 1 || imagesArray.length > 5) {
                return ResponseApi.error(res, "A product must have between 1 and 5 images", 400);
            }
            // Supprimer les anciennes images
            yield deleteProductImages(existingProduct.images);
            images = yield handleProductImagesUpload(imagesArray);
        }
        else {
            images = existingProduct.images;
        }
        const updatedProduct = yield prisma.product.update({
            where: { id },
            data: {
                name,
                description,
                price,
                categoryId,
                cityId,
                images,
                quantity,
            },
        });
        ResponseApi.success(res, "Product updated successfully", updatedProduct);
    }
    catch (error) {
        console.error("Error in updateProduct:", error);
        ResponseApi.error(res, "An error occurred while updating the product", 500);
    }
});
export const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "Product ID is required");
        }
        const existingProduct = yield prisma.product.findUnique({
            where: { id },
        });
        if (!existingProduct) {
            return ResponseApi.notFound(res, "Product not found");
        }
        // Supprimer les images du produit
        yield deleteProductImages(existingProduct.images);
        const product = yield prisma.product.delete({
            where: { id },
        });
        ResponseApi.success(res, "Product deleted successfully", product, 204);
    }
    catch (error) {
        console.error("Error in deleteProduct:", error);
        ResponseApi.error(res, "An error occurred while deleting the product", 500);
    }
});
