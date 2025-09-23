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
const cache_service_js_1 = require("../services/cache.service.js");
//creation de la ville
const createCity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        //verifions si la ville existe deja
        const existingCity = yield prisma_client_js_1.default.city.findFirst({
            where: { name: { equals: name } },
        });
        if (existingCity) {
            return response_js_1.default.error(res, "City Already exist", null, 409);
        }
        //creer la ville
        const city = yield prisma_client_js_1.default.city.create({
            data: {
                name,
            },
        });
        // Enrichir les données pour maintenir la cohérence
        const enrichedCity = {
            id: city.id,
            name: city.name,
            userCount: 0, // Nouvelle ville = 0 utilisateurs
            productCount: 0, // Nouvelle ville = 0 produits
            createdAt: city.createdAt.toISOString(),
            updatedAt: city.updatedAt.toISOString(),
        };
        // Invalider le cache des villes après création
        cache_service_js_1.cacheService.invalidateCities();
        response_js_1.default.success(res, "City create succesfully", enrichedCity);
    }
    catch (error) {
        console.log(error);
        response_js_1.default.error(res, "Failled to create City", error);
    }
});
exports.createCity = createCity;
//obtenir toutes les villes
const getAllCities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const search = req.query.search || "";
    try {
        // 🔧 VALIDATION: Vérifier que le terme de recherche n'est pas trop court
        if (search && search.trim().length < 1) {
            return response_js_1.default.error(res, "Terme de recherche trop court", null, 400);
        }
        // 🆕 SUPPORT RECHERCHE : Si recherche, ne pas utiliser le cache pour avoir des résultats à jour
        if (!search) {
            // Vérifier d'abord si les données sont en cache (uniquement pour requêtes sans recherche)
            const cachedCities = cache_service_js_1.cacheService.getCities();
            if (cachedCities) {
                return response_js_1.default.success(res, "Cities retrieved successfully (cache)", cachedCities);
            }
        }
        // Construction des filtres de recherche
        const whereClause = {};
        // Filtre de recherche par nom
        if (search && search.trim()) {
            const searchTerm = search.trim();
            whereClause.name = {
                contains: searchTerm,
            };
        }
        const cities = yield prisma_client_js_1.default.city.findMany({
            orderBy: { name: "asc" },
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined, // 🆕 UTILISE LES FILTRES
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
                userCount,
                productCount: city._count.products,
                createdAt: city.createdAt.toISOString(),
                updatedAt: city.updatedAt.toISOString(),
            };
        })));
        // 🆕 Mettre en cache seulement les requêtes sans recherche pour éviter la pollution du cache
        if (!search) {
            // Mettre en cache les données enrichies
            cache_service_js_1.cacheService.setCities(enrichedCities);
        }
        response_js_1.default.success(res, "Cities retrieved successfully", enrichedCities);
    }
    catch (error) {
        console.error("❌ Erreur dans getAllCities:", error);
        // 🔧 Gestion d'erreur améliorée avec plus de détails
        if (error instanceof Error) {
            if (error.message.includes("Prisma")) {
                response_js_1.default.error(res, "Erreur de base de données lors de la récupération des villes", error.message, 500);
            }
            else {
                response_js_1.default.error(res, "Erreur lors de la récupération des villes", error.message, 500);
            }
        }
        else {
            response_js_1.default.error(res, "Erreur inconnue lors de la récupération des villes", "Une erreur inattendue s'est produite", 500);
        }
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
        console.log(error);
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
            userCount,
            productCount,
            createdAt: updatedCity.createdAt.toISOString(),
            updatedAt: updatedCity.updatedAt.toISOString(),
        };
        // Invalider le cache des villes après mise à jour
        cache_service_js_1.cacheService.invalidateCities();
        response_js_1.default.success(res, "city update succesfully", enrichedCity);
    }
    catch (error) {
        console.log("Failled to update city", error);
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
            return response_js_1.default.error(res, "Impossible to delete city that contains products", `This city has ${productsCount} product(s)`, 409);
        }
        // Supprimer la ville
        const city = yield prisma_client_js_1.default.city.delete({ where: { id } });
        // Invalider le cache des villes après suppression
        cache_service_js_1.cacheService.invalidateCities();
        response_js_1.default.success(res, "city Delete succesfully", city);
    }
    catch (error) {
        console.log(error);
        response_js_1.default.error(res, "Failled to delete city", error);
    }
});
exports.deleteCity = deleteCity;
