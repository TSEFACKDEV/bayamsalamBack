import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import { ProductStatus } from "@prisma/client";
import { hashPassword } from "../utilities/bcrypt.js";
import { UploadedFile } from "express-fileupload";
import Utils from "../helper/utils.js";
import { cacheService } from "../services/cache.service.js";

// ✅ Helpers ultra-simplifiés
const buildUserWhereClause = (
  search: string,
  status: string,
  role: string,
  isPublicSellers: boolean
) => {
  const where: any = {};

  if (isPublicSellers) {
    where.status = "ACTIVE";
    where.products = { some: { status: ProductStatus.VALIDATED } };
    if (search) where.lastName = { contains: search };
  } else {
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (status && ["ACTIVE", "PENDING", "SUSPENDED"].includes(status)) {
      where.status = status;
    }
    if (role && ["USER", "SUPER_ADMIN"].includes(role)) {
      where.roles = { some: { role: { name: role } } };
    }
  }
  return Object.keys(where).length > 0 ? where : undefined;
};

const getUserSelectFields = (isPublicSellers: boolean) =>
  isPublicSellers
    ? {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        status: true,
        roles: { include: { role: true } },
        _count: {
          select: {
            products: { where: { status: ProductStatus.VALIDATED } },
            reviewsReceived: true,
          },
        },
        reviewsReceived: { select: { rating: true } },
        products: {
          take: 3,
          where: { status: ProductStatus.VALIDATED },
          orderBy: { createdAt: "desc" as const },
          select: { id: true, name: true, images: true, price: true },
        },
      }
    : {
        roles: { include: { role: true } },
        _count: { select: { products: true, reviewsReceived: true } },
        reviewsReceived: { select: { rating: true } },
      };

const getUserStats = async () => {
  const [total, active, pending, suspended] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
  ]);
  return { total, active, pending, suspended };
};

const handleUserError = (res: Response, error: any, context: string) => {
  console.error(`🚨 ${context}:`, {
    error: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  if (error.code === "P2025") {
    return ResponseApi.notFound(res, "User not found", 404);
  }
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return ResponseApi.error(
      res,
      "Service temporarily unavailable",
      "Database connection error",
      503
    );
  }
  if (error.name === "PrismaClientValidationError") {
    return ResponseApi.error(
      res,
      "Invalid query parameters",
      "Validation failed",
      400
    );
  }
  return ResponseApi.error(
    res,
    context,
    process.env.NODE_ENV === "development"
      ? error.message
      : "Internal server error",
    500
  );
};

const buildUserUpdateData = async (
  req: Request,
  existingUser: any,
  fields: any
) => {
  const data: any = { ...fields };

  // Gestion avatar
  if (req.files?.avatar) {
    if (existingUser.avatar) await Utils.deleteFile(existingUser.avatar);
    data.avatar = await Utils.saveFile(
      req.files.avatar as UploadedFile,
      "users"
    );
  }

  // Hash password si fourni
  if (fields.password) {
    data.password = await hashPassword(fields.password);
  }

  return data;
};

const handleUserSuspension = async (userId: string, status: string) => {
  if (status !== "SUSPENDED" && status !== "BANNED") return null;

  const userProducts = await prisma.product.findMany({
    where: { userId },
    select: { id: true, images: true, name: true },
  });

  if (userProducts.length === 0) return null;

  // Supprimer images en parallèle
  const imagePromises = userProducts.flatMap((product) =>
    (product.images as string[]).map((img) => Utils.deleteFile(img))
  );
  await Promise.allSettled(imagePromises);

  // Supprimer produits
  const deleteResult = await prisma.product.deleteMany({ where: { userId } });
  cacheService.invalidateAllProducts();

  return {
    count: deleteResult.count,
    products: userProducts.map((p) => p.name),
  };
};

const updateUserRole = async (userId: string, roleId: string) => {
  await prisma.userRole.deleteMany({ where: { userId } });
  return prisma.userRole.create({ data: { userId, roleId } });
};

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<any> => {
  // ✅ Paramètres unifiés
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const search = (req.query.search as string) || "";
  const { status, role } = req.query;
  const isPublicSellers = req.route?.path === "/public-sellers";

  try {
    // ✅ Construction WHERE ultra-simplifiée
    const whereClause = buildUserWhereClause(
      search,
      status as string,
      role as string,
      isPublicSellers
    );
    const offset = (page - 1) * limit;

    // ✅ Requête unifiée ultra-simplifiée
    const [users, total] = await Promise.all([
      isPublicSellers
        ? prisma.user.findMany({
            skip: offset,
            take: limit,
            where: whereClause,
            select: getUserSelectFields(true),
            orderBy: [
              { reviewsReceived: { _count: "desc" } },
              { createdAt: "desc" },
            ],
          })
        : prisma.user.findMany({
            skip: offset,
            take: limit,
            where: whereClause,
            include: getUserSelectFields(false),
            orderBy: { createdAt: "desc" },
          }),
      prisma.user.count({ where: whereClause }),
    ]);

    // ✅ Stats ultra-simplifiées
    const userStats = isPublicSellers
      ? { total, active: total, pending: 0, suspended: 0 }
      : await getUserStats();

    // ✅ Pagination compacte
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      perpage: limit,
      prevPage: page > 1 ? page - 1 : null,
      currentPage: page,
      nextPage: page < totalPages ? page + 1 : null,
      totalPage: totalPages,
      total,
    };

    ResponseApi.success(res, "Users retrieved successfully!", {
      users,
      pagination,
      stats: userStats,
    });
  } catch (error: any) {
    return handleUserError(res, error, "Failed to retrieve users");
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
    console.error("🚨 Error retrieving user by ID:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userId: id,
    });

    // Gestion d'erreurs spécifiques
    if (error.code === "P2025") {
      return ResponseApi.notFound(res, `User with ID ${id} not found`, 404);
    }

    if (error.name === "PrismaClientValidationError") {
      return ResponseApi.error(
        res,
        "Invalid user ID format",
        "User ID validation failed",
        400
      );
    }

    return ResponseApi.error(
      res,
      "Échec de récupération de l'utilisateur",
      process.env.NODE_ENV === "development"
        ? error.message
        : "Erreur serveur interne",
      500
    );
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
        // Statut ACTIVE par défaut pour les créations admin
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

      // Invalider le cache des stats utilisateurs après création
      cacheService.invalidateUserStats();

      ResponseApi.success(res, "User created successfully!", userWithRoles);
    } else {
      // Invalider le cache des stats utilisateurs après création
      cacheService.invalidateUserStats();

      ResponseApi.success(res, "User created successfully!", newUser);
    }
  } catch (error: any) {
    console.error("🚨 Error creating user:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      email: req.body.email,
    });

    // Gestion d'erreurs spécifiques
    if (error.code === "P2002") {
      // Contrainte unique violée (email probablement)
      return ResponseApi.error(
        res,
        "Échec de création utilisateur - email en double",
        "Un utilisateur avec cet email existe déjà",
        409
      );
    }

    if (error.code === "P2003") {
      // Contrainte de clé étrangère (roleId invalide)
      return ResponseApi.error(
        res,
        "Attribution de rôle invalide",
        "Le rôle spécifié n'existe pas",
        400
      );
    }

    if (error.name === "ValidationError") {
      return ResponseApi.error(
        res,
        "Échec de validation des données utilisateur",
        error.message,
        400
      );
    }

    if (error.message.includes("File upload")) {
      return ResponseApi.error(
        res,
        "Échec du téléchargement de l'avatar",
        "Erreur lors du téléchargement du fichier",
        413
      );
    }

    return ResponseApi.error(
      res,
      "Échec de création d'utilisateur",
      process.env.NODE_ENV === "development"
        ? error.message
        : "Erreur serveur interne",
      500
    );
  }
};

export const updateUser = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  if (!id) return ResponseApi.notFound(res, "ID is required", 422);

  try {
    // ✅ Validation et récupération utilisateur
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!existingUser) return ResponseApi.notFound(res, "User not found", 404);

    // ✅ Préparation des données ultra-simplifiée
    const { firstName, lastName, email, password, phone, roleId, status } =
      req.body;
    const updateData = await buildUserUpdateData(req, existingUser, {
      firstName,
      lastName,
      email,
      password,
      phone,
      status,
    });

    // ✅ Gestion suspension/suppression produits
    const deletedProductsInfo = await handleUserSuspension(id, status);

    // ✅ Mise à jour en parallèle
    const [updatedUser] = await Promise.all([
      prisma.user.update({ where: { id }, data: updateData }),
      roleId ? updateUserRole(id, roleId) : Promise.resolve(),
    ]);

    // ✅ Récupération finale avec rôles
    const userWithRoles = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });

    cacheService.invalidateUserStats();

    // ✅ Réponse ultra-simplifiée
    const responseMessage = deletedProductsInfo
      ? `User updated successfully. ${deletedProductsInfo.count} product(s) deleted automatically.`
      : "User updated successfully!";

    const responseData = {
      user: userWithRoles,
      ...(deletedProductsInfo && {
        deletedProducts: {
          count: deletedProductsInfo.count,
          message: `${deletedProductsInfo.count} product(s) deleted due to suspension`,
        },
      }),
    };

    ResponseApi.success(res, responseMessage, responseData);
  } catch (error: any) {
    return handleUserError(res, error, "Failed to update user");
  }
};

export const reportUser = async (req: Request, res: Response): Promise<any> => {
  const reportedUserId = req.params.id;
  const { reason, details } = req.body;

  if (!req.authUser?.id) {
    return ResponseApi.error(res, "User not authenticated", null, 401);
  }
  const reportingUserId = req.authUser?.id;

  if (!reportedUserId || !reason) {
    return ResponseApi.error(res, "Missing required fields", 400);
  }

  try {
    // Empêcher l'auto-signalement
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

    // Empêcher les signalements en double
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
    ResponseApi.error(res, "Failed to report user", error.message);
  }
};
