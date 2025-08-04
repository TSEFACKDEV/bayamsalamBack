var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";
export const getAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const { search } = req.query;
    const searchString = typeof search === "string" ? search : undefined;
    const offset = (page - 1) * limit;
    try {
        const params = {
            skip: offset,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            where: searchString
                ? {
                    title: { contains: searchString },
                }
                : undefined,
        };
        const result = yield prisma.permission.findMany(params);
        const total = yield prisma.permission.count({
            where: params.where,
        });
        ResponseApi.success(res, 'Permissions retrieved successfully !!!', {
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
        ResponseApi.error(res, 'Error retrieving permissions', error);
        console.log('====================================');
        console.log('Error in getAll:', error);
        console.log('====================================');
    }
});
export const getById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        if (!id)
            ResponseApi.error(res, 'the id doest not exist', 404);
        const result = yield prisma.permission.findFirst({
            where: {
                id
            },
        });
        ResponseApi.success(res, 'permission retrieved successfuly', result);
    }
    catch (error) {
        ResponseApi.error(res, 'Error retrieving permission', error);
        console.log('====================================');
        console.log('Error in getById:', error);
        console.log('====================================');
    }
});
export const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { permissionKey, title, description } = req.body;
        const permission = yield prisma.permission.create({ data: { permissionKey, title, description } });
        ResponseApi.success(res, 'Permission created successfully', permission, 201);
    }
    catch (error) {
        ResponseApi.error(res, 'Error creating permission', error);
        console.log('====================================');
        console.log('Error in create:', error);
        console.log('====================================');
    }
});
export const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const data = req.body;
    try {
        if (!id)
            ResponseApi.error(res, 'Id is missing', {}, 404);
        const miss = yield prisma.permission.findFirst({
            where: {
                id
            },
        });
        if (!miss)
            ResponseApi.error(res, 'Permission is missing', {}, 404);
        const result = yield prisma.permission.update({
            where: {
                id
            },
            data,
        });
        ResponseApi.success(res, 'Permission updated successfuly', result);
    }
    catch (error) {
        ResponseApi.error(res, 'Error updating permission', error);
        console.log('====================================');
        console.log('Error in update:', error);
        console.log('====================================');
    }
});
export const destroy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        if (!id)
            ResponseApi.error(res, 'Id is missing !!!', {}, 422);
        const result = yield prisma.permission.delete({
            where: {
                id
            },
        });
        ResponseApi.success(res, 'Permission deleted successfully !!!', result);
    }
    catch (error) {
        ResponseApi.error(res, 'Error deleting permission', error);
        console.log('====================================');
        console.log('Error in destroy:', error);
        console.log('====================================');
    }
});
export const assignPermissionsToRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roleId, permissionIds } = req.body;
        const assignments = permissionIds.map((permissionId) => {
            return {
                roleId,
                permissionId,
            };
        });
        yield prisma.rolePermission.createMany({
            data: assignments,
            skipDuplicates: true,
        });
        ResponseApi.success(res, 'Permissions assigned to role successfully', {}, 201);
    }
    catch (error) {
        ResponseApi.error(res, 'Error assigning permissions to role', error.message);
        console.log('====================================');
        console.log('Error in assignPermissionsToRole:', error.message);
        console.log('====================================');
    }
});
