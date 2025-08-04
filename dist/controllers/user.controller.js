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
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    try {
        const params = {
            skip: offset,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            where: !search
                ? undefined
                : {
                    firstName: { contains: search },
                },
        };
        const result = yield prisma_client_js_1.default.user.findMany(params);
        const total = yield prisma_client_js_1.default.user.count(params);
        response_js_1.default.success(res, "User retrieved succesfully !!!", {
            users: result,
            links: {
                perpage: limit,
                prevPage: page - 1 ? page - 1 : null,
                currentPage: page,
                nextPage: page + 1 ? page + 1 : null,
                totalPage: limit ? Math.ceil(total / limit) : 1,
                total: total,
            },
        });
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "failled to getAll users", error.message);
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
        const { firstName, lastName, email, password, phone } = req.body;
        if (!firstName || !lastName || !email || !password || !phone) {
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
        const newUser = yield prisma_client_js_1.default.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashed,
                phone,
                avatar: avatar,
            },
        });
        response_js_1.default.success(res, "User created successfully!", newUser);
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
        const { name, email, password, phone } = req.body;
        const data = { name, email, phone };
        const existingUser = yield prisma_client_js_1.default.user.findUnique({
            where: { id },
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
            data.avatar = { url: yield utils_js_1.default.saveFile(avatarFile, "users") };
        }
        if (password) {
            data.password = yield (0, bcrypt_js_1.hashPassword)(password);
        }
        const updatedUser = yield prisma_client_js_1.default.user.update({
            where: { id },
            data,
        });
        response_js_1.default.success(res, "User updated successfully!", updatedUser);
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
