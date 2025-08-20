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
exports.deleteCategory = exports.updateCategory = exports.getCategoryById = exports.getAllCategories = exports.createCategory = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
//creation de category
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        //verifions si la categorie existe deja
        const existingCategory = yield prisma_client_js_1.default.category.findFirst({
            where: { name: { equals: name } },
        });
        if (existingCategory) {
            return response_js_1.default.notFound(res, "Category Already exist");
        }
        //creer la category
        const category = yield prisma_client_js_1.default.category.create({
            data: {
                name,
                description,
            },
        });
        response_js_1.default.success(res, "Category create succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to create Category", error);
    }
});
exports.createCategory = createCategory;
//obtenir toutes les category
const getAllCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Recherche
        const search = req.query.search || "";
        // Construction du filtre de recherche - Compatible MySQL
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } },
            ];
        }
        // Récupération des catégories paginées et filtrées avec enrichissement
        const [categories, total] = yield Promise.all([
            prisma_client_js_1.default.category.findMany({
                where,
                orderBy: { name: "asc" },
                skip,
                take: limit,
                include: {
                    _count: {
                        select: {
                            products: true,
                        },
                    },
                },
            }),
            prisma_client_js_1.default.category.count({ where }),
        ]);
        // Enrichir les données des catégories
        const enrichedCategories = categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description,
            icon: null, // Pas encore défini dans le schéma
            color: "#f97316", // Couleur par défaut orange
            isActive: true, // Valeur par défaut (toutes actives)
            productCount: category._count.products,
            parentId: null, // Pas de hiérarchie pour l'instant
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
        }));
        const totalPages = Math.ceil(total / limit);
        response_js_1.default.success(res, "Categories retrieved succesfully", {
            categories: enrichedCategories,
            pagination: {
                total,
                page,
                limit,
                totalPages,
            },
        });
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to fetch all categories", error);
    }
});
exports.getAllCategories = getAllCategories;
//obtenir une category en fonction de son id
const getCategoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        //verification de l'id
        if (!id) {
            return response_js_1.default.notFound(res, "Id is not Found");
        }
        //recuperation de la category
        const category = yield prisma_client_js_1.default.category.findUnique({
            where: { id },
            include: {
                products: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        city: true,
                        images: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!category) {
            return response_js_1.default.notFound(res, "category not Found");
        }
        response_js_1.default.success(res, "Category retrieved succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to get category", error);
    }
});
exports.getCategoryById = getCategoryById;
//mise a jour de la category
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        //verification de l'id
        if (!id) {
            return response_js_1.default.notFound(res, "Id is not Found");
        }
        //verifions si la categorie existe (par ID, pas par nom!)
        const existingCategory = yield prisma_client_js_1.default.category.findUnique({
            where: { id },
        });
        if (!existingCategory) {
            return response_js_1.default.notFound(res, "Category not Found");
        }
        // Vérifier si le nouveau nom est déjà utilisé (seulement si le nom change)
        if (name && name.toLowerCase() !== existingCategory.name.toLowerCase()) {
            const nameExists = yield prisma_client_js_1.default.category.findFirst({
                where: { name: { equals: name }, NOT: { id } },
            });
            if (nameExists) {
                return response_js_1.default.notFound(res, "category name already in use");
            }
        }
        const category = yield prisma_client_js_1.default.category.update({
            where: { id },
            data: {
                name,
                description,
            },
        });
        response_js_1.default.success(res, "category update succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log("Failled to update category");
        console.log("====================================");
    }
});
exports.updateCategory = updateCategory;
//suprimer une category
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        //verifions si la categorie existe
        const existingCategory = yield prisma_client_js_1.default.category.findFirst({
            where: { id },
        });
        if (!existingCategory) {
            return response_js_1.default.notFound(res, "Category not Found");
        }
        // Vérifier si la catégorie contient des produits
        const productsCount = yield prisma_client_js_1.default.product.count({
            where: { categoryId: id },
        });
        if (productsCount > 0) {
            return response_js_1.default.notFound(res, "impossible to Delete Category who have a product");
        }
        // Supprimer la catégorie
        const category = yield prisma_client_js_1.default.category.delete({ where: { id } });
        response_js_1.default.success(res, "category Delete succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to delete category", error);
    }
});
exports.deleteCategory = deleteCategory;
