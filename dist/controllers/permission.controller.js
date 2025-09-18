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
exports.removePermissionsFromRole = exports.assignPermissionsToRole = exports.destroy = exports.update = exports.create = exports.getById = exports.getAll = void 0;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const getAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search } = req.query;
    const searchString = typeof search === 'string' ? search : undefined;
    const offset = (page - 1) * limit;
    try {
        const params = {
            skip: offset,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
            where: searchString
                ? {
                    title: { contains: searchString },
                }
                : undefined,
        };
        const result = yield prisma_client_js_1.default.permission.findMany(params);
        const total = yield prisma_client_js_1.default.permission.count({
            where: params.where,
        });
        response_js_1.default.success(res, 'Permissions retrieved successfully !!!', {
            permission: result,
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
        next(error); // <-- transmet l'erreur au middleware global
    }
});
exports.getAll = getAll;
const getById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        if (!id)
            response_js_1.default.error(res, 'the id doest not exist', 404);
        const result = yield prisma_client_js_1.default.permission.findFirst({
            where: {
                id,
            },
        });
        response_js_1.default.success(res, 'permission retrieved successfuly', result);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error retrieving permission', error);
    }
});
exports.getById = getById;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { permissionKey, title, description } = req.body;
        const permission = yield prisma_client_js_1.default.permission.create({
            data: { permissionKey, title, description },
        });
        response_js_1.default.success(res, 'Permission created successfully', permission, 201);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error creating permission', error);
    }
});
exports.create = create;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const data = req.body;
    try {
        if (!id)
            response_js_1.default.error(res, 'Id is missing', {}, 404);
        const miss = yield prisma_client_js_1.default.permission.findFirst({
            where: {
                id,
            },
        });
        if (!miss)
            response_js_1.default.error(res, 'Permission is missing', {}, 404);
        const result = yield prisma_client_js_1.default.permission.update({
            where: {
                id,
            },
            data,
        });
        response_js_1.default.success(res, 'Permission updated successfuly', result);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error updating permission', error);
    }
});
exports.update = update;
const destroy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        if (!id)
            response_js_1.default.error(res, 'Id is missing !!!', {}, 422);
        const result = yield prisma_client_js_1.default.permission.delete({
            where: {
                id,
            },
        });
        response_js_1.default.success(res, 'Permission deleted successfully !!!', result);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error deleting permission', error);
    }
});
exports.destroy = destroy;
const assignPermissionsToRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roleId, permissionIds } = req.body;
        const assignments = permissionIds.map((permissionId) => {
            return {
                roleId,
                permissionId,
            };
        });
        yield prisma_client_js_1.default.rolePermission.createMany({
            data: assignments,
            skipDuplicates: true,
        });
        response_js_1.default.success(res, 'Permissions assigned to role successfully', {}, 201);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error assigning permissions to role', error.message);
    }
});
exports.assignPermissionsToRole = assignPermissionsToRole;
const removePermissionsFromRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roleId, permissionIds } = req.body;
        if (!roleId || !permissionIds || !Array.isArray(permissionIds)) {
            return response_js_1.default.error(res, 'roleId and permissionIds array are required', {}, 400);
        }
        // Supprimer les permissions spécifiées du rôle
        yield prisma_client_js_1.default.rolePermission.deleteMany({
            where: {
                roleId: roleId,
                permissionId: {
                    in: permissionIds,
                },
            },
        });
        response_js_1.default.success(res, 'Permissions removed from role successfully', {}, 200);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error removing permissions from role', error.message);
    }
});
exports.removePermissionsFromRole = removePermissionsFromRole;
