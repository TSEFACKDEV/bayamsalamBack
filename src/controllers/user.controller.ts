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
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || "";

  try {
    // 🔍 AMÉLIORATION : Recherche multi-champs au lieu d'un seul champ
    const whereClause = !search
      ? undefined
      : {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ],
        };

    const params = {
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: "desc" as const,
      },
      where: whereClause,
      // 🔗 NOUVEAU : Inclusion des rôles ET comptage des produits
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        _count: {
          select: {
            products: true, // Compter tous les produits de l'utilisateur
          },
        },
      },
    };

    // Récupérer les utilisateurs
    const result = await prisma.user.findMany(params);

    // Compter le total pour la pagination
    const total = await prisma.user.count({ where: whereClause });

    // 📊 NOUVEAU : Calcul automatique des statistiques par statut
    const stats = {
      total: await prisma.user.count(),
      active: await prisma.user.count({ where: { status: "ACTIVE" } }),
      pending: await prisma.user.count({ where: { status: "PENDING" } }),
      suspended: await prisma.user.count({ where: { status: "SUSPENDED" } }),
    };

    // 📄 AMÉLIORATION : Format de pagination plus standard
    const pagination = {
      perpage: limit,
      prevPage: page > 1 ? page - 1 : null,
      currentPage: page,
      nextPage: Math.ceil(total / limit) > page ? page + 1 : null,
      totalPage: Math.ceil(total / limit),
      total: total,
    };

    // 🎯 NOUVEAU : Réponse enrichie avec users, pagination et stats
    ResponseApi.success(res, "Users retrieved successfully!", {
      users: result,
      pagination,
      stats,
    });
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failed to get all users", error.message);
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
    // 🔧 NOUVEAU : Support du roleId pour l'assignation de rôle
    const { firstName, lastName, email, password, phone, roleId } = req.body;

    if (!firstName || !lastName || !email || !password) {
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

    // Créer l'utilisateur
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashed,
        phone,
        avatar: avatar,
        // 🎯 NOUVEAU : Statut ACTIVE par défaut pour les créations admin
        status: "ACTIVE", // Par défaut actif pour les créations admin
      },
      // 🔗 NOUVEAU : Inclusion des rôles dans la réponse
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // 👤 NOUVEAU : Assignation automatique du rôle si fourni
    if (roleId) {
      await prisma.userRole.create({
        data: {
          userId: newUser.id,
          roleId: roleId,
        },
      });

      // Récupérer l'utilisateur avec les rôles
      const userWithRoles = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      ResponseApi.success(res, "User created successfully!", userWithRoles);
    } else {
      ResponseApi.success(res, "User created successfully!", newUser);
    }
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
    // 🔧 NOUVEAU : Support des nouveaux champs pour l'admin
    const { firstName, lastName, email, password, phone, roleId, status } =
      req.body;
    const data: any = { firstName, lastName, email, phone };

    // 🔍 AMÉLIORATION : Récupération avec les rôles existants
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });
    if (!existingUser) {
      return ResponseApi.notFound(res, "User not found", 404);
    }

    // Gestion de l'avatar
    if (req.files && req.files.avatar) {
      // Supprimer l'ancien avatar si présent
      if (existingUser.avatar) {
        await Utils.deleteFile(existingUser.avatar);
      }
      const avatarFile = req.files.avatar as UploadedFile;
      data.avatar = await Utils.saveFile(avatarFile, "users");
    }

    // Mettre à jour le mot de passe si fourni
    if (password) {
      data.password = await hashPassword(password);
    }

    // 🎯 NOUVEAU : Support de la modification du statut utilisateur
    if (status) {
      data.status = status;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    // 👤 NOUVEAU : Gestion complète des rôles (remplacement)
    if (roleId) {
      // Supprimer tous les anciens rôles
      await prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Ajouter le nouveau rôle
      await prisma.userRole.create({
        data: {
          userId: id,
          roleId: roleId,
        },
      });
    }

    // 🔗 AMÉLIORATION : Récupération avec les rôles pour la réponse
    const userWithRoles = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    ResponseApi.success(res, "User updated successfully!", userWithRoles);
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

// rajoutons une fonctionaliter permettant de signaler un utilisateur
export const reportUser = async (req: Request, res: Response): Promise<any> => {
  const reportedUserId = req.params.id;
  const { reason, details } = req.body;
  // ✅ CORRECTION : Utiliser l'utilisateur authentifié depuis le middleware
  if (!req.authUser?.id) {
    return ResponseApi.error(res, "User not authenticated", null, 401);
  }
  const reportingUserId = req.authUser?.id; // ID de l'utilisateur qui signale

  if (!reportedUserId || !reason) {
    return ResponseApi.error(res, "Missing required fields", 400);
  }

  try {
    // ✅ CORRECTION : Empêcher l'auto-signalement
    if (reportedUserId === reportingUserId) {
      return ResponseApi.error(res, "You cannot report yourself", 400);
    }

    // Vérifier si l'utilisateur signalé existe
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedUserId },
    });
    if (!reportedUser) {
      return ResponseApi.notFound(res, "Reported user not found", 404);
    }

    // ✅ CORRECTION : Empêcher les signalements en double
    const existingReport = await prisma.userReport.findFirst({
      where: {
        reportedUserId,
        reportingUserId,
      },
    });
    if (existingReport) {
      return ResponseApi.error(res, "You have already reported this user", 400);
    }

    // Créer le signalement
    const report = await prisma.userReport.create({
      data: {
        reportedUserId,
        reportingUserId,
        reason,
        details,
      },
    });

    ResponseApi.success(res, "User reported successfully!", report);
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failed to report user", error.message);
  }
};
