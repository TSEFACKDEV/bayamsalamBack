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
import { hashPassword } from "../utilities/bcrypt.js";
import Utils from "../helper/utils.js";
export const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                    name: { contains: search },
                },
        };
        const result = yield prisma.user.findMany(params);
        const total = yield prisma.user.count(params);
        ResponseApi.success(res, "User retrieved succesfully !!!", {
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
        ResponseApi.error(res, "failled to getAll users", error.message);
    }
});
export const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "id is not found", 422);
        }
        const result = yield prisma.user.findFirst({
            where: {
                id,
            },
        });
        if (!result)
            return ResponseApi.notFound(res, "User Is not Found");
        ResponseApi.success(res, "user retrieved succesfully", result);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "failled to get user", error.message);
    }
});
export const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return ResponseApi.error(res, "Missing required fields", 400);
        }
        const existingUser = yield prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return ResponseApi.error(res, "User already exists", 400);
        }
        let avatar = null;
        if (req.files && req.files.avatar) {
            const avatarFile = req.files.avatar;
            avatar = yield Utils.saveFile(avatarFile, "users");
        }
        const hashed = yield hashPassword(password);
        const newUser = yield prisma.user.create({
            data: {
                name,
                email,
                password: hashed,
                phone,
                avatar: avatar,
            },
        });
        ResponseApi.success(res, "User created successfully!", newUser);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failed to create user", error.message);
    }
});
export const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    if (!id) {
        return ResponseApi.notFound(res, "id is not found", 422);
    }
    try {
        const { name, email, password, phone } = req.body;
        const data = { name, email, phone };
        const existingUser = yield prisma.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return ResponseApi.notFound(res, "User not found", 404);
        }
        // Gestion de l'avatar
        if (req.files && req.files.avatar) {
            // Supprimer l'ancien avatar si présent
            if (existingUser.avatar) {
                yield Utils.deleteFile(existingUser.avatar);
            }
            const avatarFile = req.files.avatar;
            data.avatar = { url: yield Utils.saveFile(avatarFile, "users") };
        }
        if (password) {
            data.password = yield hashPassword(password);
        }
        const updatedUser = yield prisma.user.update({
            where: { id },
            data,
        });
        ResponseApi.success(res, "User updated successfully!", updatedUser);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failed to update user", error.message);
    }
});
export const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    if (!id) {
        return ResponseApi.notFound(res, "id is not found", 422);
    }
    try {
        const existingUser = yield prisma.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return ResponseApi.notFound(res, "User not found", 404);
        }
        // Supprimer l'avatar si présent
        if (existingUser.avatar) {
            yield Utils.deleteFile(existingUser.avatar);
        }
        const user = yield prisma.user.delete({
            where: { id },
        });
        ResponseApi.success(res, "User deleted successfully!", user);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        ResponseApi.error(res, "Failed to delete user", error.message);
    }
});
