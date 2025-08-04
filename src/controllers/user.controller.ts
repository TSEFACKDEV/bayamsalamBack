import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import { hashPassword } from "../utilities/bcrypt.js";
import { UploadedFile } from "express-fileupload";
import Utils from "../helper/utils.js";

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || "";
  try {
    const params = {
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: "desc" as const,
      },
      where: !search
        ? undefined
        : {
            firstName: { contains: search },
          },
    };
    const result = await prisma.user.findMany(params);
    const total = await prisma.user.count(params);
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
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "failled to getAll users", error.message);
  }
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<any> => {
  const id = req.params.id;
  try {
    if (!id) {
      return ResponseApi.notFound(res, "id is not found", 422);
    }
    const result = await prisma.user.findFirst({
      where: {
        id,
      },
    });
    if (!result) return ResponseApi.notFound(res, "User Is not Found");
    ResponseApi.success(res, "user retrieved succesfully", result);
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "failled to get user", error.message);
  }
};

export const createUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    if (!firstName || !lastName || !email || !password || !phone) {
      return ResponseApi.error(res, "Missing required fields", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return ResponseApi.error(res, "User already exists", 400);
    }

    let avatar = null;
    if (req.files && req.files.avatar) {
      const avatarFile = req.files.avatar as UploadedFile;
      avatar = await Utils.saveFile(avatarFile, "users");
    }

    const hashed = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashed,
        phone,
        avatar: avatar,
      },
    });

    ResponseApi.success(res, "User created successfully!", newUser);
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failed to create user", error.message);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id;
  if (!id) {
    return ResponseApi.notFound(res, "id is not found", 422);
  }
  try {
    const { name, email, password, phone } = req.body;
    const data: any = { name, email, phone };

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      return ResponseApi.notFound(res, "User not found", 404);
    }

    // Gestion de l'avatar
    if (req.files && req.files.avatar) {
      // Supprimer l'ancien avatar si présent
      if (existingUser.avatar ) {
        await Utils.deleteFile(existingUser.avatar);
      }
      const avatarFile = req.files.avatar as UploadedFile;
      data.avatar = { url: await Utils.saveFile(avatarFile, "users") };
    }

    if (password) {
      data.password = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    ResponseApi.success(res, "User updated successfully!", updatedUser);
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failed to update user", error.message);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id;
  if (!id) {
    return ResponseApi.notFound(res, "id is not found", 422);
  }
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      return ResponseApi.notFound(res, "User not found", 404);
    }

    // Supprimer l'avatar si présent
    if (existingUser.avatar) {
      await Utils.deleteFile(existingUser.avatar);
    }

    const user = await prisma.user.delete({
      where: { id },
    });

    ResponseApi.success(res, "User deleted successfully!", user);
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failed to delete user", error.message);
  }
};
