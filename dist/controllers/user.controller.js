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
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const bcrypt_js_1 = require("../utilities/bcrypt.js");
const utils_js_1 = __importDefault(require("../helper/utils.js"));
/**
 * 📋 RÉCUPÉRATION DE TOUS LES UTILISATEURS AVEC SUPPORT ADMIN
 *
 * MODIFICATIONS APPORTÉES :
 * ✅ Ajout des relations avec les rôles (include: roles)
 * ✅ Amélioration de la recherche multi-champs (firstName, lastName, email)
 * ✅ Calcul automatique des statistiques utilisateur par statut
 * ✅ Format de réponse standardisé avec pagination et stats
 * ✅ Gestion robuste des erreurs
 */
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
            // 🔗 NOUVEAU : Inclusion des rôles pour l'interface admin
            include: {
                roles: {
                    include: {
                        role: true,
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
/**
 * ➕ CRÉATION D'UTILISATEUR AVEC SUPPORT DES RÔLES
 *
 * MODIFICATIONS APPORTÉES :
 * ✅ Support de l'assignation de rôle lors de la création (roleId)
 * ✅ Statut par défaut "ACTIVE" pour les créations admin
 * ✅ Retour des données avec les rôles inclus
 * ✅ Gestion optionnelle du mot de passe (pour les admins)
 * ✅ Validation améliorée des champs requis
 */
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
/**
 * ✏️ MISE À JOUR D'UTILISATEUR AVEC GESTION DES RÔLES ET STATUTS
 *
 * MODIFICATIONS APPORTÉES :
 * ✅ Support de la modification des rôles (roleId)
 * ✅ Support de la modification du statut utilisateur (status)
 * ✅ Gestion complète des champs utilisateur (firstName, lastName, etc.)
 * ✅ Remplacement automatique des rôles (suppression puis ajout)
 * ✅ Retour des données avec les rôles inclus
 * ✅ Récupération des rôles existants pour validation
 */
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
