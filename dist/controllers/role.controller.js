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
    try {
        const roles = yield prisma.role.findMany();
        ResponseApi.success(res, 'Roles retrieved successfully', roles);
    }
    catch (error) {
        ResponseApi.error(res, 'Error retrieving roles', error);
        console.log('====================================');
        console.log('Error in getAll:', error);
        console.log('====================================');
    }
});
export const getById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        if (!id)
            ResponseApi.error(res, 'Id is missing !!!', null, 404);
        const result = yield prisma.role.findFirst({
            where: {
                id
            },
        });
        if (!result)
            ResponseApi.error(res, 'role not found!!!', null, 404);
        ResponseApi.error(res, 'role retrieved successfully !!!', result);
    }
    catch (error) {
        ResponseApi.error(res, 'Error retrieving role', error);
        console.log('====================================');
        console.log('Error in getById:', error);
        console.log('====================================');
    }
});
export const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const data = req.body;
    try {
        if (!id) {
            ResponseApi.error(res, 'Id is missing !!!', null, 422);
            return;
        }
        res.status(422).json({
            message: 'Id is missing !!!',
            data: null,
        });
        const result = yield prisma.role.update({
            where: {
                id
            },
            data,
        });
        if (!result)
            ResponseApi.error(res, 'role not found !!!', {}, 404);
        ResponseApi.error(res, 'role updated successfully !!!', result ? result : null);
    }
    catch (error) {
        ResponseApi.error(res, 'Error updating role', error);
        console.log('====================================');
        console.log('Error in update:', error);
        console.log('====================================');
    }
});
export const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        const role = yield prisma.role.create({ data: { name, description } });
        ResponseApi.success(res, 'Role created successfully', role, 201);
    }
    catch (error) {
        ResponseApi.error(res, 'Error creating role', error);
        console.log('====================================');
        console.log('Error in create:', error);
        console.log('====================================');
    }
});
export const destroy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        if (!id)
            ResponseApi.error(res, 'Id is missing !!!', {}, 422);
        const result = yield prisma.role.delete({
            where: {
                id
            },
        });
        ResponseApi.success(res, 'Role deleted successfully !!!', result);
    }
    catch (error) {
        ResponseApi.error(res, 'Error deleting role', error);
        console.log('====================================');
        console.log('Error in destroy:', error);
        console.log('====================================');
    }
});
export const assignRolesToUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, roleIds } = req.body;
        const assignments = roleIds.map((roleId) => {
            return {
                userId,
                roleId,
            };
        });
        yield prisma.userRole.createMany({
            data: assignments,
            skipDuplicates: true,
        });
        ResponseApi.success(res, 'Roles assigned to user successfully', {}, 201);
    }
    catch (error) {
        ResponseApi.error(res, 'Error assigning roles to user', error.message);
        console.log('====================================');
        console.log('Error in assignRolesToUser:', error);
        console.log('====================================');
    }
});
