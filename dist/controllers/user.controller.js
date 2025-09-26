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
exports.reportUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const client_1 = require("@prisma/client");
const bcrypt_js_1 = require("../utilities/bcrypt.js");
const utils_js_1 = __importDefault(require("../helper/utils.js"));
const cache_service_js_1 = require("../services/cache.service.js");
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // 🎯 Limite pour page vendeurs
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status;
    const role = req.query.role;
    // Détection du mode public
    const isPublicSellers = ((_a = req.route) === null || _a === void 0 ? void 0 : _a.path) === "/public-sellers";
    try {
        // Construction simple de la clause WHERE
        const whereClause = {};
        // Mode public : vendeurs actifs avec produits VALIDÉS uniquement
        if (isPublicSellers) {
            whereClause.status = "ACTIVE";
            whereClause.products = { some: { status: client_1.ProductStatus.VALIDATED } };
            // Recherche par nom de famille uniquement (selon vos exigences)
            if (search) {
                whereClause.lastName = { contains: search };
            }
        }
        else {
            // Mode admin : recherche complète
            if (search) {
                whereClause.OR = [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { email: { contains: search } },
                ];
            }
            // Filtres admin
            if (status && ["ACTIVE", "PENDING", "SUSPENDED"].includes(status)) {
                whereClause.status = status;
            }
            if (role && ["USER", "SUPER_ADMIN"].includes(role)) {
                whereClause.roles = {
                    some: { role: { name: role } },
                };
            }
        }
        // 🔒 SÉCURITÉ : Récupération selon le mode (simplifié)
        const result = isPublicSellers
            ? yield prisma_client_js_1.default.user.findMany({
                skip: offset,
                take: limit,
                where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    isVerified: true,
                    createdAt: true,
                    status: true,
                    roles: { include: { role: true } },
                    _count: {
                        select: {
                            products: { where: { status: client_1.ProductStatus.VALIDATED } },
                            reviewsReceived: true,
                        },
                    },
                    reviewsReceived: { select: { rating: true } },
                    products: {
                        take: 3,
                        where: { status: client_1.ProductStatus.VALIDATED },
                        orderBy: { createdAt: "desc" },
                        select: { id: true, name: true, images: true, price: true },
                    },
                },
                orderBy: [
                    { reviewsReceived: { _count: "desc" } },
                    { createdAt: "desc" }, // ✅ Tri simplifié - date de création pour départager
                ],
            })
            : yield prisma_client_js_1.default.user.findMany({
                skip: offset,
                take: limit,
                where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
                include: {
                    roles: { include: { role: true } },
                    _count: { select: { products: true, reviewsReceived: true } },
                    reviewsReceived: { select: { rating: true } },
                },
                orderBy: { createdAt: "desc" },
            });
        // Compter le total
        const total = yield prisma_client_js_1.default.user.count({
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        });
        // Statistiques simplifiées
        const userStats = isPublicSellers
            ? { total, active: total, pending: 0, suspended: 0 }
            : {
                total: yield prisma_client_js_1.default.user.count(),
                active: yield prisma_client_js_1.default.user.count({ where: { status: "ACTIVE" } }),
                pending: yield prisma_client_js_1.default.user.count({ where: { status: "PENDING" } }),
                suspended: yield prisma_client_js_1.default.user.count({
                    where: { status: "SUSPENDED" },
                }),
            };
        // Calcul de la pagination simplifié
        const totalPage = Math.ceil(total / limit);
        const pagination = {
            perpage: limit,
            prevPage: page > 1 ? page - 1 : null,
            currentPage: page,
            nextPage: page < totalPage ? page + 1 : null,
            totalPage,
            total,
        };
        // Réponse enrichie avec users, pagination et stats
        response_js_1.default.success(res, "Users retrieved successfully!", {
            users: result,
            pagination,
            stats: userStats,
        });
    }
    catch (error) {
        console.error("🚨 Error retrieving users:", {
            error: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            params: { page, limit, search, status, role },
        });
        // Gestion d'erreurs spécifiques
        if (error.code === "P2025") {
            return response_js_1.default.error(res, "Users not found", "No users match the search criteria", 404);
        }
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
            return response_js_1.default.error(res, "User service temporarily unavailable", "Database connection error", 503);
        }
        if (error.name === "PrismaClientValidationError") {
            return response_js_1.default.error(res, "Invalid user query parameters", "Query validation failed", 400);
        }
        return response_js_1.default.error(res, "Échec de récupération des utilisateurs", process.env.NODE_ENV === "development"
            ? error.message
            : "Erreur serveur interne", 500);
    }
});
exports.getAllUsers = getAllUsers;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "id is not found", 422);
        }
        const result = yield prisma_client_js_1.default.user.findFirst({
            where: {
                id,
            },
        });
        if (!result)
            return response_js_1.default.notFound(res, "User Is not Found");
        response_js_1.default.success(res, "user retrieved succesfully", result);
    }
    catch (error) {
        console.error("🚨 Error retrieving user by ID:", {
            error: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            userId: id,
        });
        // Gestion d'erreurs spécifiques
        if (error.code === "P2025") {
            return response_js_1.default.notFound(res, `User with ID ${id} not found`, 404);
        }
        if (error.name === "PrismaClientValidationError") {
            return response_js_1.default.error(res, "Invalid user ID format", "User ID validation failed", 400);
        }
        return response_js_1.default.error(res, "Échec de récupération de l'utilisateur", process.env.NODE_ENV === "development"
            ? error.message
            : "Erreur serveur interne", 500);
    }
});
exports.getUserById = getUserById;
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 🔧 NOUVEAU : Support du roleId pour l'assignation de rôle
        const { firstName, lastName, email, password, phone, roleId } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return response_js_1.default.error(res, "Missing required fields", 400);
        }
        const existingUser = yield prisma_client_js_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return response_js_1.default.error(res, "User already exists", 400);
        }
        let avatar = null;
        if (req.files && req.files.avatar) {
            const avatarFile = req.files.avatar;
            avatar = yield utils_js_1.default.saveFile(avatarFile, "users");
        }
        const hashed = yield (0, bcrypt_js_1.hashPassword)(password);
        // Créer l'utilisateur
        const newUser = yield prisma_client_js_1.default.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashed,
                phone,
                avatar: avatar,
                // Statut ACTIVE par défaut pour les créations admin
                status: "ACTIVE", // Par défaut actif pour les créations admin
            },
            // 🔗 NOUVEAU : Inclusion des rôles dans la réponse
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        // 👤 NOUVEAU : Assignation automatique du rôle si fourni
        if (roleId) {
            yield prisma_client_js_1.default.userRole.create({
                data: {
                    userId: newUser.id,
                    roleId: roleId,
                },
            });
            // Récupérer l'utilisateur avec les rôles
            const userWithRoles = yield prisma_client_js_1.default.user.findUnique({
                where: { id: newUser.id },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });
            // Invalider le cache des stats utilisateurs après création
            cache_service_js_1.cacheService.invalidateUserStats();
            response_js_1.default.success(res, "User created successfully!", userWithRoles);
        }
        else {
            // Invalider le cache des stats utilisateurs après création
            cache_service_js_1.cacheService.invalidateUserStats();
            response_js_1.default.success(res, "User created successfully!", newUser);
        }
    }
    catch (error) {
        console.error("🚨 Error creating user:", {
            error: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            email: req.body.email,
        });
        // Gestion d'erreurs spécifiques
        if (error.code === "P2002") {
            // Contrainte unique violée (email probablement)
            return response_js_1.default.error(res, "Échec de création utilisateur - email en double", "Un utilisateur avec cet email existe déjà", 409);
        }
        if (error.code === "P2003") {
            // Contrainte de clé étrangère (roleId invalide)
            return response_js_1.default.error(res, "Attribution de rôle invalide", "Le rôle spécifié n'existe pas", 400);
        }
        if (error.name === "ValidationError") {
            return response_js_1.default.error(res, "Échec de validation des données utilisateur", error.message, 400);
        }
        if (error.message.includes("File upload")) {
            return response_js_1.default.error(res, "Échec du téléchargement de l'avatar", "Erreur lors du téléchargement du fichier", 413);
        }
        return response_js_1.default.error(res, "Échec de création d'utilisateur", process.env.NODE_ENV === "development"
            ? error.message
            : "Erreur serveur interne", 500);
    }
});
exports.createUser = createUser;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    if (!id) {
        return response_js_1.default.notFound(res, "id is not found", 422);
    }
    try {
        // 🔧 NOUVEAU : Support des nouveaux champs pour l'admin
        const { firstName, lastName, email, password, phone, roleId, status } = req.body;
        const data = { firstName, lastName, email, phone };
        // 🔍 AMÉLIORATION : Récupération avec les rôles existants
        const existingUser = yield prisma_client_js_1.default.user.findUnique({
            where: { id },
            include: {
                roles: true,
            },
        });
        if (!existingUser) {
            return response_js_1.default.notFound(res, "User not found", 404);
        }
        // Gestion de l'avatar
        if (req.files && req.files.avatar) {
            // Supprimer l'ancien avatar si présent
            if (existingUser.avatar) {
                yield utils_js_1.default.deleteFile(existingUser.avatar);
            }
            const avatarFile = req.files.avatar;
            data.avatar = yield utils_js_1.default.saveFile(avatarFile, "users");
        }
        // Mettre à jour le mot de passe si fourni
        if (password) {
            data.password = yield (0, bcrypt_js_1.hashPassword)(password);
        }
        // Support de la modification du statut utilisateur avec gestion automatique des produits
        let deletedProductsInfo = null;
        if (status) {
            data.status = status;
            // Supprimer tous les produits si l'utilisateur est suspendu ou banni
            if (status === "SUSPENDED" || status === "BANNED") {
                // Récupérer d'abord tous les produits pour supprimer les images
                const userProducts = yield prisma_client_js_1.default.product.findMany({
                    where: { userId: id },
                    select: { id: true, images: true, name: true },
                });
                if (userProducts.length > 0) {
                    // Supprimer les images associées aux produits
                    const imagePromises = userProducts.flatMap((product) => {
                        const images = product.images;
                        return images.map((img) => utils_js_1.default.deleteFile(img));
                    });
                    // Attendre que toutes les suppressions d'images soient terminées
                    yield Promise.allSettled(imagePromises);
                    // Supprimer tous les produits de l'utilisateur
                    const deleteResult = yield prisma_client_js_1.default.product.deleteMany({
                        where: { userId: id },
                    });
                    deletedProductsInfo = {
                        count: deleteResult.count,
                        products: userProducts.map((p) => p.name),
                    };
                    // Invalider le cache après suppression des produits
                    cache_service_js_1.cacheService.invalidateAllProducts();
                }
            }
        }
        // Mettre à jour l'utilisateur
        const updatedUser = yield prisma_client_js_1.default.user.update({
            where: { id },
            data,
        });
        // 👤 NOUVEAU : Gestion complète des rôles (remplacement)
        if (roleId) {
            // Supprimer tous les anciens rôles
            yield prisma_client_js_1.default.userRole.deleteMany({
                where: { userId: id },
            });
            // Ajouter le nouveau rôle
            yield prisma_client_js_1.default.userRole.create({
                data: {
                    userId: id,
                    roleId: roleId,
                },
            });
        }
        // 🔗 AMÉLIORATION : Récupération avec les rôles pour la réponse
        const userWithRoles = yield prisma_client_js_1.default.user.findUnique({
            where: { id },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        // Invalider le cache des stats utilisateurs après mise à jour
        cache_service_js_1.cacheService.invalidateUserStats();
        // Inclure les informations sur les produits supprimés si applicable
        const responseMessage = deletedProductsInfo
            ? `Utilisateur mis à jour avec succès. ${deletedProductsInfo.count} produit(s) supprimé(s) automatiquement.`
            : "User updated successfully!";
        const responseData = Object.assign({ user: userWithRoles }, (deletedProductsInfo && {
            deletedProducts: {
                count: deletedProductsInfo.count,
                message: `${deletedProductsInfo.count} produit(s) supprimé(s) suite à la suspension/bannissement`,
            },
        }));
        response_js_1.default.success(res, responseMessage, responseData);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to update user", error.message);
    }
});
exports.updateUser = updateUser;
const reportUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const reportedUserId = req.params.id;
    const { reason, details } = req.body;
    if (!((_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id)) {
        return response_js_1.default.error(res, "User not authenticated", null, 401);
    }
    const reportingUserId = (_b = req.authUser) === null || _b === void 0 ? void 0 : _b.id;
    if (!reportedUserId || !reason) {
        return response_js_1.default.error(res, "Missing required fields", 400);
    }
    try {
        // Empêcher l'auto-signalement
        if (reportedUserId === reportingUserId) {
            return response_js_1.default.error(res, "You cannot report yourself", 400);
        }
        // Vérifier si l'utilisateur signalé existe
        const reportedUser = yield prisma_client_js_1.default.user.findUnique({
            where: { id: reportedUserId },
        });
        if (!reportedUser) {
            return response_js_1.default.notFound(res, "Reported user not found", 404);
        }
        // Empêcher les signalements en double
        const existingReport = yield prisma_client_js_1.default.userReport.findFirst({
            where: {
                reportedUserId,
                reportingUserId,
            },
        });
        if (existingReport) {
            return response_js_1.default.error(res, "You have already reported this user", 400);
        }
        // Créer le signalement
        const report = yield prisma_client_js_1.default.userReport.create({
            data: {
                reportedUserId,
                reportingUserId,
                reason,
                details,
            },
        });
        response_js_1.default.success(res, "User reported successfully!", report);
    }
    catch (error) {
        response_js_1.default.error(res, "Failed to report user", error.message);
    }
});
exports.reportUser = reportUser;
