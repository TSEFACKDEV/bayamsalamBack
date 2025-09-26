import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import { ProductStatus } from "@prisma/client";
import { hashPassword } from "../utilities/bcrypt.js";
import { UploadedFile } from "express-fileupload";
import Utils from "../helper/utils.js";
import { cacheService } from "../services/cache.service.js";

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12; // 🎯 Limite pour page vendeurs
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || "";
  const status = req.query.status as string;
  const role = req.query.role as string;

  // Détection du mode public
  const isPublicSellers = req.route?.path === "/public-sellers";

  try {
    // Construction simple de la clause WHERE
    const whereClause: any = {};

    // Mode public : vendeurs actifs avec produits VALIDÉS uniquement
    if (isPublicSellers) {
      whereClause.status = "ACTIVE";
      whereClause.products = { some: { status: ProductStatus.VALIDATED } };

      // Recherche par nom de famille uniquement (selon vos exigences)
      if (search) {
        whereClause.lastName = { contains: search };
      }
    } else {
      // Mode admin : recherche complète
      if (search) {
        whereClause.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ];
      }

      // Filtres admin
      if (status && ["ACTIVE", "PENDING", "SUSPENDED"].includes(status)) {
        whereClause.status = status;
      }

      if (role && ["USER", "SUPER_ADMIN"].includes(role)) {
        whereClause.roles = {
          some: { role: { name: role } },
        };
      }
    }

    // 🔒 SÉCURITÉ : Récupération selon le mode (simplifié)
    const result = isPublicSellers
      ? await prisma.user.findMany({
          skip: offset,
          take: limit,
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          select: {
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
          },
          orderBy: [
            { reviewsReceived: { _count: "desc" } },
            { createdAt: "desc" }, // ✅ Tri simplifié - date de création pour départager
          ],
        })
      : await prisma.user.findMany({
          skip: offset,
          take: limit,
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          include: {
            roles: { include: { role: true } },
            _count: { select: { products: true, reviewsReceived: true } },
            reviewsReceived: { select: { rating: true } },
          },
          orderBy: { createdAt: "desc" },
        });

    // Compter le total
    const total = await prisma.user.count({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    });

    // Statistiques simplifiées
    const userStats = isPublicSellers
      ? { total, active: total, pending: 0, suspended: 0 }
      : {
          total: await prisma.user.count(),
          active: await prisma.user.count({ where: { status: "ACTIVE" } }),
          pending: await prisma.user.count({ where: { status: "PENDING" } }),
          suspended: await prisma.user.count({
            where: { status: "SUSPENDED" },
          }),
        };

    // Calcul de la pagination simplifié
    const totalPage = Math.ceil(total / limit);
    const pagination = {
      perpage: limit,
      prevPage: page > 1 ? page - 1 : null,
      currentPage: page,
      nextPage: page < totalPage ? page + 1 : null,
      totalPage,
      total,
    };

    // Réponse enrichie avec users, pagination et stats
    ResponseApi.success(res, "Users retrieved successfully!", {
      users: result,
      pagination,
      stats: userStats,
    });
  } catch (error: any) {
    console.error("🚨 Error retrieving users:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      params: { page, limit, search, status, role },
    });

    // Gestion d'erreurs spécifiques
    if (error.code === "P2025") {
      return ResponseApi.error(
        res,
        "Users not found",
        "No users match the search criteria",
        404
      );
    }

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return ResponseApi.error(
        res,
        "User service temporarily unavailable",
        "Database connection error",
        503
      );
    }

    if (error.name === "PrismaClientValidationError") {
      return ResponseApi.error(
        res,
        "Invalid user query parameters",
        "Query validation failed",
        400
      );
    }

    return ResponseApi.error(
      res,
      "Échec de récupération des utilisateurs",
      process.env.NODE_ENV === "development"
        ? error.message
        : "Erreur serveur interne",
      500
    );
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

    // Support de la modification du statut utilisateur avec gestion automatique des produits
    let deletedProductsInfo = null;
    if (status) {
      data.status = status;

      // Supprimer tous les produits si l'utilisateur est suspendu ou banni
      if (status === "SUSPENDED" || status === "BANNED") {
        // Récupérer d'abord tous les produits pour supprimer les images
        const userProducts = await prisma.product.findMany({
          where: { userId: id },
          select: { id: true, images: true, name: true },
        });

        if (userProducts.length > 0) {
          // Supprimer les images associées aux produits
          const imagePromises = userProducts.flatMap((product) => {
            const images = product.images as string[];
            return images.map((img) => Utils.deleteFile(img));
          });

          // Attendre que toutes les suppressions d'images soient terminées
          await Promise.allSettled(imagePromises);

          // Supprimer tous les produits de l'utilisateur
          const deleteResult = await prisma.product.deleteMany({
            where: { userId: id },
          });

          deletedProductsInfo = {
            count: deleteResult.count,
            products: userProducts.map((p) => p.name),
          };

          // Invalider le cache après suppression des produits
          cacheService.invalidateAllProducts();
        }
      }
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

    // Invalider le cache des stats utilisateurs après mise à jour
    cacheService.invalidateUserStats();

    // Inclure les informations sur les produits supprimés si applicable
    const responseMessage = deletedProductsInfo
      ? `Utilisateur mis à jour avec succès. ${deletedProductsInfo.count} produit(s) supprimé(s) automatiquement.`
      : "User updated successfully!";

    const responseData = {
      user: userWithRoles,
      ...(deletedProductsInfo && {
        deletedProducts: {
          count: deletedProductsInfo.count,
          message: `${deletedProductsInfo.count} produit(s) supprimé(s) suite à la suspension/bannissement`,
        },
      }),
    };

    ResponseApi.success(res, responseMessage, responseData);
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failed to update user", error.message);
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
