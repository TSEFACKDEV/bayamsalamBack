import { NextFunction, Request, Response } from "express";
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";


const checkPermission = (permissionKey: string) => {
  return async (req:Request, res: Response, next: NextFunction):Promise<any> => {
    const userId = req.authUser?.id;

    try {
      const user = await prisma.user.findUnique({
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
    } catch (error) {
      next(error);
    }
  };
};

export default checkPermission;
