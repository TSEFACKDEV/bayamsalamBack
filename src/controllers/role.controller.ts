import { NextFunction, Request, Response } from "express";
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";

export const getAll = async (req: Request, res: Response): Promise<any> => {
  const search = (req.query.search as string) || "";

  try {
    // 🆕 Construction des filtres de recherche (similaire à user.controller.ts et city.controller.ts)
    const whereClause: any = {};

    // Filtre de recherche par nom de rôle
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const roles = await prisma.role.findMany({
      // 📊 NOUVEAU : Tri alphabétique des rôles
      orderBy: {
        name: "asc",
      },
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined, // 🆕 UTILISE LES FILTRES
      // 🔗 NOUVEAU : Inclusion des permissions pour chaque rôle
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    ResponseApi.success(res, "Roles retrieved successfully", roles);
  } catch (error) {
    ResponseApi.error(res, "Error retrieving roles", error);
  }
};

export const getById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    if (!id) ResponseApi.error(res, "Id is missing !!!", null, 404);
    const result = await prisma.role.findFirst({
      where: {
        id,
      },
    });
    if (!result) ResponseApi.error(res, "role not found!!!", null, 404);

    ResponseApi.error(res, "role retrieved successfully !!!", result);
  } catch (error) {
    ResponseApi.error(res, "Error retrieving role", error);
  }
};

export const update = async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id;
  const data = req.body;

  try {
    if (!id) {
      ResponseApi.error(res, "Id is missing !!!", null, 422);
      return;
    }
    res.status(422).json({
      message: "Id is missing !!!",
      data: null,
    });
    const result = await prisma.role.update({
      where: {
        id,
      },
      data,
    });

    if (!result) ResponseApi.error(res, "role not found !!!", {}, 404);
    ResponseApi.error(
      res,
      "role updated successfully !!!",
      result ? result : null
    );
  } catch (error) {
    ResponseApi.error(res, "Error updating role", error);
  }
};

export const create = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, description } = req.body;
    const role = await prisma.role.create({ data: { name, description } });
    ResponseApi.success(res, "Role created successfully", role, 201);
  } catch (error) {
    ResponseApi.error(res, "Error creating role", error);
  }
};

export const destroy = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    if (!id) ResponseApi.error(res, "Id is missing !!!", {}, 422);
    const result = await prisma.role.delete({
      where: {
        id,
      },
    });
    ResponseApi.success(res, "Role deleted successfully !!!", result);
  } catch (error) {
    ResponseApi.error(res, "Error deleting role", error);
  }
};

export const assignRolesToUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { userId, roleIds } = req.body;
    const assignments = (roleIds as string[]).map((roleId: string) => {
      return {
        userId,
        roleId,
      };
    });

    await prisma.userRole.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    ResponseApi.success(res, "Roles assigned to user successfully", {}, 201);
  } catch (error: any) {
    ResponseApi.error(res, "Error assigning roles to user", error.message);
  }
};
