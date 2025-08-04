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
exports.assignRolesToUser = exports.destroy = exports.create = exports.update = exports.getById = exports.getAll = void 0;
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const getAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roles = yield prisma_client_js_1.default.role.findMany();
        response_js_1.default.success(res, 'Roles retrieved successfully', roles);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error retrieving roles', error);
        console.log('====================================');
        console.log('Error in getAll:', error);
        console.log('====================================');
    }
});
exports.getAll = getAll;
const getById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        if (!id)
            response_js_1.default.error(res, 'Id is missing !!!', null, 404);
        const result = yield prisma_client_js_1.default.role.findFirst({
            where: {
                id
            },
        });
        if (!result)
            response_js_1.default.error(res, 'role not found!!!', null, 404);
        response_js_1.default.error(res, 'role retrieved successfully !!!', result);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error retrieving role', error);
        console.log('====================================');
        console.log('Error in getById:', error);
        console.log('====================================');
    }
});
exports.getById = getById;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const data = req.body;
    try {
        if (!id) {
            response_js_1.default.error(res, 'Id is missing !!!', null, 422);
            return;
        }
        res.status(422).json({
            message: 'Id is missing !!!',
            data: null,
        });
        const result = yield prisma_client_js_1.default.role.update({
            where: {
                id
            },
            data,
        });
        if (!result)
            response_js_1.default.error(res, 'role not found !!!', {}, 404);
        response_js_1.default.error(res, 'role updated successfully !!!', result ? result : null);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error updating role', error);
        console.log('====================================');
        console.log('Error in update:', error);
        console.log('====================================');
    }
});
exports.update = update;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        const role = yield prisma_client_js_1.default.role.create({ data: { name, description } });
        response_js_1.default.success(res, 'Role created successfully', role, 201);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error creating role', error);
        console.log('====================================');
        console.log('Error in create:', error);
        console.log('====================================');
    }
});
exports.create = create;
const destroy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        if (!id)
            response_js_1.default.error(res, 'Id is missing !!!', {}, 422);
        const result = yield prisma_client_js_1.default.role.delete({
            where: {
                id
            },
        });
        response_js_1.default.success(res, 'Role deleted successfully !!!', result);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error deleting role', error);
        console.log('====================================');
        console.log('Error in destroy:', error);
        console.log('====================================');
    }
});
exports.destroy = destroy;
const assignRolesToUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, roleIds } = req.body;
        const assignments = roleIds.map((roleId) => {
            return {
                userId,
                roleId,
            };
        });
        yield prisma_client_js_1.default.userRole.createMany({
            data: assignments,
            skipDuplicates: true,
        });
        response_js_1.default.success(res, 'Roles assigned to user successfully', {}, 201);
    }
    catch (error) {
        response_js_1.default.error(res, 'Error assigning roles to user', error.message);
        console.log('====================================');
        console.log('Error in assignRolesToUser:', error);
        console.log('====================================');
    }
});
exports.assignRolesToUser = assignRolesToUser;
