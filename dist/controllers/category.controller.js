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
//creation de category
export const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        //verifions si la categorie existe deja
        const existingCategory = yield prisma.category.findFirst({
            where: { name: { equals: name } },
        });
        if (existingCategory) {
            return ResponseApi.notFound(res, "Category Already exist");
        }
        //creer la category
        const category = yield prisma.category.create({
            data: {
                name,
                description
            },
        });
        ResponseApi.success(res, "Category create succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failled to create Category", error);
    }
});
//obtenir toutes les category
export const getAllCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield prisma.category.findMany({
            orderBy: { name: "asc" },
        });
        ResponseApi.success(res, "Categories retrieved succesfully", categories);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failled to fect all categories", error);
    }
});
//obtenir une category en fonction de son id
export const getCategoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        //verification de l'id
        if (!id) {
            return ResponseApi.notFound(res, "Id is not Found");
        }
        //recuperation de la category
        const category = yield prisma.category.findUnique({
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
            return ResponseApi.notFound(res, "category not Found");
        }
        ResponseApi.success(res, "Category retrieved succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failled to get category", error);
    }
});
//mise a jour de la category
export const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        //verification de l'id
        if (!id) {
            return ResponseApi.notFound(res, "Id is not Found");
        }
        //verifions si la categorie existe
        const existingCategory = yield prisma.category.findFirst({
            where: { name: { equals: name } },
        });
        if (!existingCategory) {
            return ResponseApi.notFound(res, "Category not Found");
        }
        // Vérifier si le nouveau nom est déjà utilisé
        if (name && name.toLowerCase() !== existingCategory.name.toLowerCase()) {
            const nameExists = yield prisma.category.findFirst({
                where: { name: { equals: name }, NOT: { id } },
            });
            if (nameExists) {
                return ResponseApi.notFound(res, "category name already in use");
            }
        }
        const category = yield prisma.category.update({
            where: { id },
            data: {
                name,
                description,
            },
        });
        ResponseApi.success(res, "category update succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log("Failled to update category");
        console.log("====================================");
    }
});
//suprimer une category
export const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        //verifions si la categorie existe
        const existingCategory = yield prisma.category.findFirst({
            where: { id },
        });
        if (!existingCategory) {
            return ResponseApi.notFound(res, "Category not Found");
        }
        // Vérifier si la catégorie contient des produits
        const productsCount = yield prisma.product.count({ where: { categoryId: id } });
        if (productsCount > 0) {
            return ResponseApi.notFound(res, "impossible to Delete Category who have a product");
        }
        // Supprimer la catégorie
        const category = yield prisma.category.delete({ where: { id } });
        ResponseApi.success(res, "category Delete succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failled to delete category", error);
    }
});
