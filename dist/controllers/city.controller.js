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
exports.deleteCity = exports.updateCity = exports.getCityById = exports.getAllCities = exports.createCity = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
//creation de la ville
const createCity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        //verifions si la ville existe deja
        const existingCity = yield prisma_client_js_1.default.city.findFirst({
            where: { name: { equals: name } },
        });
        if (existingCity) {
            return response_js_1.default.notFound(res, "City Already exist");
        }
        //creer la ville
        const city = yield prisma_client_js_1.default.city.create({
            data: {
                name,
            },
        });
        // Enrichir les données comme dans getAllCities pour maintenir la cohérence
        const enrichedCity = {
            id: city.id,
            name: city.name,
            region: null,
            country: "Cameroun",
            latitude: null,
            longitude: null,
            userCount: 0, // Nouvelle ville = 0 utilisateurs
            productCount: 0, // Nouvelle ville = 0 produits
            isActive: true,
            createdAt: city.createdAt.toISOString(),
            updatedAt: city.updatedAt.toISOString(),
        };
        response_js_1.default.success(res, "City create succesfully", enrichedCity);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to create City", error);
    }
});
exports.createCity = createCity;
//obtenir toutes les villes
const getAllCities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cities = yield prisma_client_js_1.default.city.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });
        // Enrichir les données avec les comptes d'utilisateurs et formater la réponse
        const enrichedCities = yield Promise.all(cities.map((city) => __awaiter(void 0, void 0, void 0, function* () {
            // Compter les utilisateurs uniques ayant des produits dans cette ville
            const userCount = yield prisma_client_js_1.default.user.count({
                where: {
                    products: {
                        some: {
                            cityId: city.id,
                        },
                    },
                },
            });
            return {
                id: city.id,
                name: city.name,
                region: null, // Pas encore défini dans le schéma
                country: "Cameroun", // Valeur par défaut
                latitude: null,
                longitude: null,
                userCount,
                productCount: city._count.products,
                isActive: true, // Valeur par défaut
                createdAt: city.createdAt.toISOString(),
                updatedAt: city.updatedAt.toISOString(),
            };
        })));
        response_js_1.default.success(res, "Cities retrieved successfully", enrichedCities);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to fect all cities", error);
    }
});
exports.getAllCities = getAllCities;
//obtenir une ville en fonction de son id
const getCityById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        //verification de l'id
        if (!id) {
            return response_js_1.default.notFound(res, "Id is not Found");
        }
        //recuperation de la ville
        const city = yield prisma_client_js_1.default.city.findUnique({
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
            return response_js_1.default.notFound(res, "city not Found");
        }
        response_js_1.default.success(res, "City retrieved succesfully", city);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to get city", error);
    }
});
exports.getCityById = getCityById;
//mise a jour de la ville
const updateCity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        //verification de l'id
        if (!id) {
            return response_js_1.default.notFound(res, "Id is not Found");
        }
        //verifions si la ville existe par ID
        const existingCity = yield prisma_client_js_1.default.city.findUnique({
            where: { id },
        });
        if (!existingCity) {
            return response_js_1.default.notFound(res, "City not Found");
        }
        // Vérifier si le nouveau nom est déjà utilisé par une autre ville
        if (name && name.toLowerCase() !== existingCity.name.toLowerCase()) {
            const nameExists = yield prisma_client_js_1.default.city.findFirst({
                where: { name: { equals: name }, NOT: { id } },
            });
            if (nameExists) {
                return response_js_1.default.error(res, "city name already in use", null);
            }
        }
        const updatedCity = yield prisma_client_js_1.default.city.update({
            where: { id },
            data: {
                name,
            },
        });
        // Enrichir les données comme dans getAllCities pour maintenir la cohérence
        const userCount = yield prisma_client_js_1.default.user.count({
            where: {
                products: {
                    some: {
                        cityId: updatedCity.id,
                    },
                },
            },
        });
        const productCount = yield prisma_client_js_1.default.product.count({
            where: {
                cityId: updatedCity.id,
            },
        });
        const enrichedCity = {
            id: updatedCity.id,
            name: updatedCity.name,
            region: null,
            country: "Cameroun",
            latitude: null,
            longitude: null,
            userCount,
            productCount,
            isActive: true,
            createdAt: updatedCity.createdAt.toISOString(),
            updatedAt: updatedCity.updatedAt.toISOString(),
        };
        response_js_1.default.success(res, "city update succesfully", enrichedCity);
    }
    catch (error) {
        console.log("====================================");
        console.log("Failled to update city", error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to update city", error);
    }
});
exports.updateCity = updateCity;
//suprimer une ville
const deleteCity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        //verifions si la ville existe
        const existingCity = yield prisma_client_js_1.default.city.findFirst({
            where: { id },
        });
        if (!existingCity) {
            return response_js_1.default.notFound(res, "City not Found");
        }
        // Vérifier si la ville contient des produits
        const productsCount = yield prisma_client_js_1.default.product.count({
            where: { cityId: id },
        });
        if (productsCount > 0) {
            return response_js_1.default.notFound(res, "impossible to Delete ville  who have a product");
        }
        // Supprimer la ville
        const city = yield prisma_client_js_1.default.city.delete({ where: { id } });
        response_js_1.default.success(res, "city Delete succesfully", city);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failled to delete city", error);
    }
});
exports.deleteCity = deleteCity;
