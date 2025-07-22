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
//creation de la ville
export const createCity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        //verifions si la ville existe deja
        const existingCity = yield prisma.city.findFirst({
            where: { name: { equals: name } },
        });
        if (existingCity) {
            return ResponseApi.notFound(res, "City Already exist");
        }
        //creer la ville
        const category = yield prisma.city.create({
            data: {
                name,
            },
        });
        ResponseApi.success(res, "City create succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failled to create City", error);
    }
});
//obtenir toutes les villes
export const getAllCities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cities = yield prisma.city.findMany({
            orderBy: { name: "asc" },
        });
        ResponseApi.success(res, "Categories retrieved succesfully", cities);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failled to fect all cities", error);
    }
});
//obtenir une ville en fonction de son id
export const getCityById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        //verification de l'id
        if (!id) {
            return ResponseApi.notFound(res, "Id is not Found");
        }
        //recuperation de la ville
        const city = yield prisma.city.findUnique({
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
        if (!city) {
            return ResponseApi.notFound(res, "city not Found");
        }
        ResponseApi.success(res, "City retrieved succesfully", city);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failled to get city", error);
    }
});
//mise a jour de la ville
export const updateCity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        //verification de l'id
        if (!id) {
            return ResponseApi.notFound(res, "Id is not Found");
        }
        //verifions si la ville existe
        const existingCity = yield prisma.city.findFirst({
            where: { name: { equals: name } },
        });
        if (!existingCity) {
            return ResponseApi.notFound(res, "City not Found");
        }
        // Vérifier si le nouveau nom est déjà utilisé
        if (name && name.toLowerCase() !== existingCity.name.toLowerCase()) {
            const nameExists = yield prisma.city.findFirst({
                where: { name: { equals: name }, NOT: { id } },
            });
            if (nameExists) {
                return ResponseApi.notFound(res, "city name already in use");
            }
        }
        const category = yield prisma.city.update({
            where: { id },
            data: {
                name
            },
        });
        ResponseApi.success(res, "city update succesfully", category);
    }
    catch (error) {
        console.log("====================================");
        console.log("Failled to update city");
        console.log("====================================");
    }
});
//suprimer une ville
export const deleteCity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        //verifions si la ville existe
        const existingCity = yield prisma.city.findFirst({
            where: { id },
        });
        if (!existingCity) {
            return ResponseApi.notFound(res, "City not Found");
        }
        // Vérifier si la ville contient des produits
        const productsCount = yield prisma.product.count({
            where: { cityId: id },
        });
        if (productsCount > 0) {
            return ResponseApi.notFound(res, "impossible to Delete ville  who have a product");
        }
        // Supprimer la ville
        const city = yield prisma.city.delete({ where: { id } });
        ResponseApi.success(res, "city Delete succesfully", city);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failled to delete city", error);
    }
});
