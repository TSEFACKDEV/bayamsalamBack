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
exports.reportUser = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const bcrypt_js_1 = require("../utilities/bcrypt.js");
const utils_js_1 = __importDefault(require("../helper/utils.js"));
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    try {
        // 🔍 AMÉLIORATION : Recherche multi-champs au lieu d'un seul champ
        const whereClause = !search
            ? undefined
            : {
                OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { email: { contains: search } },
                ],
            };
        const params = {
            skip: offset,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            where: whereClause,
            // 🔗 NOUVEAU : Inclusion des rôles ET comptage des produits
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
                _count: {
                    select: {
                        products: true, // Compter tous les produits de l'utilisateur
                    },
                },
            },
        };
        // Récupérer les utilisateurs
        const result = yield prisma_client_js_1.default.user.findMany(params);
        // Compter le total pour la pagination
        const total = yield prisma_client_js_1.default.user.count({ where: whereClause });
        // 📊 NOUVEAU : Calcul automatique des statistiques par statut
        const stats = {
            total: yield prisma_client_js_1.default.user.count(),
            active: yield prisma_client_js_1.default.user.count({ where: { status: "ACTIVE" } }),
            pending: yield prisma_client_js_1.default.user.count({ where: { status: "PENDING" } }),
            suspended: yield prisma_client_js_1.default.user.count({ where: { status: "SUSPENDED" } }),
        };
        // 📄 AMÉLIORATION : Format de pagination plus standard
        const pagination = {
            perpage: limit,
            prevPage: page > 1 ? page - 1 : null,
            currentPage: page,
            nextPage: Math.ceil(total / limit) > page ? page + 1 : null,
            totalPage: Math.ceil(total / limit),
            total: total,
        };
        // 🎯 NOUVEAU : Réponse enrichie avec users, pagination et stats
        response_js_1.default.success(res, "Users retrieved successfully!", {
            users: result,
            pagination,
            stats,
        });
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to get all users", error.message);
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
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "failled to get user", error.message);
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
                // 🎯 NOUVEAU : Statut ACTIVE par défaut pour les créations admin
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
            response_js_1.default.success(res, "User created successfully!", userWithRoles);
        }
        else {
            response_js_1.default.success(res, "User created successfully!", newUser);
        }
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to create user", error.message);
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
        // 🎯 NOUVEAU : Support de la modification du statut utilisateur
        if (status) {
            data.status = status;
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
        response_js_1.default.success(res, "User updated successfully!", userWithRoles);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to update user", error.message);
    }
});
exports.updateUser = updateUser;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    if (!id) {
        return response_js_1.default.notFound(res, "id is not found", 422);
    }
    try {
        const existingUser = yield prisma_client_js_1.default.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return response_js_1.default.notFound(res, "User not found", 404);
        }
        // Supprimer l'avatar si présent
        if (existingUser.avatar) {
            yield utils_js_1.default.deleteFile(existingUser.avatar);
        }
        const user = yield prisma_client_js_1.default.user.delete({
            where: { id },
        });
        response_js_1.default.success(res, "User deleted successfully!", user);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to delete user", error.message);
    }
});
exports.deleteUser = deleteUser;
// rajoutons une fonctionaliter permettant de signaler un utilisateur
const reportUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const reportedUserId = req.params.id;
    const { reason, details } = req.body;
    // ✅ CORRECTION : Utiliser l'utilisateur authentifié depuis le middleware
    if (!((_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id)) {
        return response_js_1.default.error(res, "User not authenticated", null, 401);
    }
    const reportingUserId = (_b = req.authUser) === null || _b === void 0 ? void 0 : _b.id; // ID de l'utilisateur qui signale
    if (!reportedUserId || !reason) {
        return response_js_1.default.error(res, "Missing required fields", 400);
    }
    try {
        // ✅ CORRECTION : Empêcher l'auto-signalement
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
        // ✅ CORRECTION : Empêcher les signalements en double
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
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to report user", error.message);
    }
});
exports.reportUser = reportUser;
