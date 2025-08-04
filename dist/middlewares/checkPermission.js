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
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const checkPermission = (permissionKey) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = req.user.id;
        try {
            const user = yield prisma_client_js_1.default.user.findUnique({
                where: { id: userId },
                include: {
                    roles: {
                        include: {
                            role: {
                                include: {
                                    permissions: {
                                        include: {
                                            permission: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (!user) {
                return response_js_1.default.error(res, 'User not found', {}, 404);
            }
            const userPermissions = user.roles.flatMap((userRole) => {
                return userRole.role.permissions.map((permission) => {
                    return permission.permission.permissionKey;
                });
            });
            if (!userPermissions.includes(permissionKey)) {
                return response_js_1.default.error(res, 'Forbidden: You do not have the required permission', {}, 403);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
exports.default = checkPermission;
