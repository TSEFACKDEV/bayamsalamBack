import { promises } from "dns";
import { Request, Response, NextFunction } from "express";
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";


export const getAll = async (req:Request, res:Response, next:NextFunction):Promise<any> => {
    // Pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const { search } = req.query;
  const searchString = typeof search === "string" ? search : undefined;
  const offset = (page - 1) * limit;

  try {
    const params = {
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: "desc" as const,
      },
      where: searchString
        ? {
          title: { contains: searchString },
        }
        : undefined,
    };
    const result = await prisma.permission.findMany(params);
    const total = await prisma.permission.count({
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
  } catch (error) {
    next(error); // <-- transmet l'erreur au middleware global
  }
};

export const getById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    if (!id) ResponseApi.error(res, 'the id doest not exist', 404);
    const result = await prisma.permission.findFirst({
      where: {
        id
      },
    });
    ResponseApi.success(res, 'permission retrieved successfuly', result);
  } catch (error) {
    ResponseApi.error(res, 'Error retrieving permission', error);
    console.log('====================================');
    console.log('Error in getById:', error);
    console.log('====================================');
  }
};

export const create = async (req: Request, res: Response): Promise<any> => {
  try {
    const { permissionKey, title, description } = req.body;
    const permission = await prisma.permission.create({ data: { permissionKey, title, description } });
    ResponseApi.success(res, 'Permission created successfully', permission, 201);
  } catch (error) {
    ResponseApi.error(res, 'Error creating permission', error);
    console.log('====================================');
    console.log('Error in create:', error);
    console.log('====================================');
  }
};

export const update = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const data = req.body;
  try {
    if (!id) ResponseApi.error(res, 'Id is missing', {}, 404);
    const miss = await prisma.permission.findFirst({
      where: {
        id
      },
    });
    if (!miss) ResponseApi.error(res, 'Permission is missing', {}, 404);
    const result = await prisma.permission.update({
      where: {
        id
      },
      data,
    });

    ResponseApi.success(res, 'Permission updated successfuly', result);
  } catch (error) {
    ResponseApi.error(res, 'Error updating permission', error);
    console.log('====================================');
    console.log('Error in update:', error);
    console.log('====================================');
  }
};

export const destroy = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    if (!id) ResponseApi.error(res, 'Id is missing !!!', {}, 422);
    const result = await prisma.permission.delete({
      where: {
        id
      },
    });
    ResponseApi.success(res, 'Permission deleted successfully !!!', result);
  } catch (error) {
    ResponseApi.error(res, 'Error deleting permission', error);
    console.log('====================================');
    console.log('Error in destroy:', error);
    console.log('====================================');
  }
};

export const assignPermissionsToRole = async (req: Request, res: Response): Promise<any> => {
  try {
    const { roleId, permissionIds } = req.body;
    const assignments = (permissionIds as string[]).map((permissionId: string) => {
      return {
        roleId,
        permissionId,
      };
    });

    await prisma.rolePermission.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    ResponseApi.success(res, 'Permissions assigned to role successfully', {}, 201);
  } catch (error:any) {
    ResponseApi.error(res, 'Error assigning permissions to role', error.message);
    console.log('====================================');
    console.log('Error in assignPermissionsToRole:', error.message);
    console.log('====================================');
  }
};
