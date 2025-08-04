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
const checkPermission = (permissionKey) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = req.user.id;
        try {
            const user = yield prisma.user.findUnique({
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
                return ResponseApi.error(res, 'User not found', {}, 404);
            }
            const userPermissions = user.roles.flatMap((userRole) => {
                return userRole.role.permissions.map((permission) => {
                    return permission.permission.permissionKey;
                });
            });
            if (!userPermissions.includes(permissionKey)) {
                return ResponseApi.error(res, 'Forbidden: You do not have the required permission', {}, 403);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
export default checkPermission;
