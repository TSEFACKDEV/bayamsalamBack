import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import Utils from "../helper/utils.js";
import { sendEmail } from "../utilities/mailer.js";
import { reviewProductTemplate } from "../templates/reviewProductTemplate.js";
import { createNotification } from "../services/notification.service.js";
import { initiateFuturaPayment } from "../services/futurapay.service.js";
import { uploadProductImages } from "../utilities/upload.js";
import { Prisma, ForfaitType } from "@prisma/client";
import { cacheService } from "../services/cache.service.js";
import ProductTransformer from "../utils/productTransformer.js";
import {
  sanitizeSearchParam,
  sanitizeNumericParam,
} from "../utils/securityUtils.js";
import {
  logSecurityEvent,
  SecurityEventType,
} from "../utils/securityMonitor.js";

// Fonction pour enregistrer une vue d'annonce (utilisateurs connectés uniquement)
export const recordProductView = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { productId } = req.params;
    const userId = req.authUser?.id;

    if (!userId) {
      return ResponseApi.error(res, "Utilisateur non authentifié", null, 401);
    }

    if (!productId) {
      return ResponseApi.error(res, "ID du produit requis", null, 400);
    }

    // Vérifier que le produit existe et est validé
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "VALIDATED",
      },
    });

    if (!product) {
      return ResponseApi.notFound(res, "Produit non trouvé ou non validé", 404);
    }

    // Vérifier si l'utilisateur a déjà vu ce produit
    const existingView = await prisma.productView.findUnique({
      where: {
        userId_productId: {
          userId: userId,
          productId: productId,
        },
      },
    });

    if (existingView) {
      // L'utilisateur a déjà vu ce produit, ne pas compter à nouveau
      return ResponseApi.success(res, "Vue déjà enregistrée", {
        isNewView: false,
        viewCount: product.viewCount,
      });
    }

    // Enregistrer la nouvelle vue et incrémenter le compteur en une seule transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer l'enregistrement de vue
      await tx.productView.create({
        data: {
          userId: userId,
          productId: productId,
        },
      });

      // Incrémenter le compteur de vues du produit
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      return updatedProduct;
    });

    ResponseApi.success(res, "Vue enregistrée avec succès", {
      isNewView: true,
      viewCount: result.viewCount,
    });
  } catch (error: any) {
    ResponseApi.error(
      res,
      "Erreur lors de l'enregistrement de la vue",
      error.message
    );
  }
};

// Fonction pour obtenir les statistiques de vues d'un produit
export const getProductViewStats = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return ResponseApi.error(res, "ID du produit requis", null, 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        viewCount: true,
        _count: {
          select: {
            views: true, // Compte exact des vues uniques
          },
        },
      },
    });

    if (!product) {
      return ResponseApi.notFound(res, "Produit non trouvé", 404);
    }

    ResponseApi.success(res, "Statistiques de vues récupérées", {
      productId: product.id,
      productName: product.name,
      viewCount: product.viewCount,
      uniqueViews: product._count.views,
    });
  } catch (error: any) {
    ResponseApi.error(
      res,
      "Erreur lors de la récupération des statistiques",
      error.message
    );
  }
};
// pour recuperer tous les produits avec pagination  [ce ci sera pour les administrateurs]
// ✅ UPDATED: Ajout du support du filtrage par status
export const getAllProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  const page = sanitizeNumericParam(req.query.page, 1, 1, 1000);
  const limit = sanitizeNumericParam(req.query.limit, 10, 1, 100);
  const offset = (page - 1) * limit;
  const search = sanitizeSearchParam(req.query.search);
  const status = req.query.status as string; // ✅ Récupérer le paramètre status

  // 🔐 Logging de sécurité si des paramètres ont été nettoyés
  if (req.query.search && req.query.search !== search) {
    await logSecurityEvent(
      {
        type: SecurityEventType.PARAMETER_POLLUTION,
        severity: "MEDIUM",
        details: {
          original: String(req.query.search),
          sanitized: search,
          reason: "Search parameter sanitized in getAllProducts",
        },
        blocked: false,
      },
      req
    );
  }

  try {
    const where: any = {};
    if (search) {
      // MODIFIÉ: Supprimé mode "insensitive" car non supporté par MySQL - utilise contains simple
      where.name = { contains: search };
    }

    // ✅ Ajouter le filtre par status si fourni
    if (status && ["PENDING", "VALIDATED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    const products = await prisma.product.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      where,
      include: {
        category: true,
        city: true,
        user: true, // On inclut l'utilisateur
      },
    });

    // 🚀 OPTIMISATION N+1: Récupération groupée des reviews (85% réduction requêtes)
    const userIds = products.map((p) => p.userId);
    const reviewsAggregation = await prisma.review.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _avg: { rating: true },
      _sum: { rating: true },
      _count: { rating: true },
    });

    // Map optimisée pour O(1) lookup des stats utilisateurs
    const userStatsMap = new Map(
      reviewsAggregation.map((review) => [
        review.userId,
        {
          totalPoints: review._sum.rating || 0,
          averagePoints: review._avg.rating || null,
          reviewCount: review._count.rating || 0,
        },
      ])
    );

    // Transformation des produits avec stats utilisateurs et URLs images
    const productsWithUserPoints = products.map((product) => {
      const userStats = userStatsMap.get(product.userId) || {
        totalPoints: 0,
        averagePoints: null,
        reviewCount: 0,
      };

      return {
        ...product,
        // �️ Conversion sécurisée des images en URLs complètes
        images: ProductTransformer.transformProduct(req, product).images,
        userTotalPoints: userStats.totalPoints,
        userAveragePoints: userStats.averagePoints,
      };
    });

    const total = await prisma.product.count({ where });

    ResponseApi.success(res, "Products retrieved successfully!", {
      products: productsWithUserPoints,
      links: {
        perpage: limit,
        prevPage: page > 1 ? page - 1 : null,
        currentPage: page,
        nextPage: offset + limit < total ? page + 1 : null,
        totalPage: Math.ceil(total / limit),
        total: total,
      },
    });
  } catch (error: any) {
    ResponseApi.error(res, "Failed to get all products", error.message);
  }
};

//pour recuperer tous les produits sans pagination [administrateur]

export const getAllProductsWithoutPagination = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        city: true,
        user: true,
      },
    });

    ResponseApi.success(res, "Products retrieved successfully!", {
      products,
    });
  } catch (error: any) {
    ResponseApi.error(res, "Failed to get all products", error.message);
  }
};

//pour recuperer tous les produits avec un status = VALIDATED, pagination et recherche [pour les utilisateurs]

export const getValidatedProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  const page = sanitizeNumericParam(req.query.page, 1, 1, 1000);
  const limit = sanitizeNumericParam(req.query.limit, 10, 1, 100);
  const offset = (page - 1) * limit;
  const search = sanitizeSearchParam(req.query.search);
  const categoryId = req.query.categoryId;
  const cityId = req.query.cityId;

  // 🔐 Logging de sécurité si des paramètres ont été nettoyés
  if (req.query.search && req.query.search !== search) {
    await logSecurityEvent(
      {
        type: SecurityEventType.PARAMETER_POLLUTION,
        severity: "MEDIUM",
        details: {
          original: String(req.query.search),
          sanitized: search,
          reason: "Search parameter sanitized in getValidatedProducts",
        },
        blocked: false,
      },
      req
    );
  }

  // ✅ NOUVEAUX FILTRES - Prix et État (sécurisés)
  const priceMin = req.query.priceMin
    ? sanitizeNumericParam(req.query.priceMin, 0, 0, 10000000)
    : undefined;
  const priceMax = req.query.priceMax
    ? sanitizeNumericParam(
        req.query.priceMax,
        Number.MAX_SAFE_INTEGER,
        0,
        10000000
      )
    : undefined;
  const etat = req.query.etat as string; // NEUF, OCCASION, CORRECT

  try {
    const where: any = { status: "VALIDATED" };

    // Filtre de recherche par nom
    if (search) {
      where.name = { contains: search };
    }

    // Filtre par catégorie
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filtre par ville
    if (cityId) {
      where.cityId = cityId;
    }

    // ✅ NOUVEAU - Filtre par prix minimum
    if (priceMin !== undefined && !isNaN(priceMin)) {
      where.price = { ...where.price, gte: priceMin };
    }

    // ✅ NOUVEAU - Filtre par prix maximum
    if (priceMax !== undefined && !isNaN(priceMax)) {
      where.price = { ...where.price, lte: priceMax };
    }

    // ✅ NOUVEAU - Filtre par état
    if (etat && ["NEUF", "OCCASION", "CORRECT"].includes(etat)) {
      where.etat = etat;
    }

    const products = await prisma.product.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      where,
      include: {
        category: true,
        city: true,
        user: true,
        // On inclut les forfaits actifs pour pouvoir trier côté serveur
        productForfaits: {
          where: { isActive: true, expiresAt: { gt: new Date() } },
          include: { forfait: true },
        },
      },
    });

    // ✅ MISE À JOUR - Tri optimisé côté serveur par priorité des forfaits avec nouvelles priorités
    const forfaitPriority: Record<string, number> = {
      PREMIUM: 1, // Priorité la plus haute
      A_LA_UNE: 2, // ✅ NOUVEAU - Deuxième priorité
      TOP_ANNONCE: 3, // Troisième priorité
      URGENT: 4, // Quatrième priorité
      MISE_EN_AVANT: 5, // Priorité la plus basse
    };

    const getPriority = (p: any) => {
      if (!p.productForfaits || p.productForfaits.length === 0)
        return Number.MAX_SAFE_INTEGER;

      // On prend la meilleure (la plus haute priorité = plus petit nombre)
      const priorities = p.productForfaits.map(
        (pf: any) =>
          forfaitPriority[pf.forfait?.type] ?? Number.MAX_SAFE_INTEGER
      );
      return Math.min(...priorities);
    };

    const sortedByForfait = products.slice().sort((a: any, b: any) => {
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pa - pb; // priorité ascendante (1 = premium first)
      // Si même priorité, trier par date décroissante
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = await prisma.product.count({ where });

    const productsWithImageUrls =
      ProductTransformer.transformProductsWithForfaits(req, sortedByForfait);

    ResponseApi.success(res, "Validated products retrieved successfully!", {
      products: productsWithImageUrls,
      links: {
        perpage: limit,
        prevPage: page > 1 ? page - 1 : null,
        currentPage: page,
        nextPage: offset + limit < total ? page + 1 : null,
        totalPage: Math.ceil(total / limit),
        total: total,
      },
    });
  } catch (error: any) {
    ResponseApi.error(res, "Failed to get validated products", error.message);
  }
};

// pour voire tous les produits nouvellement creer avec un statut PENDING [administrateurs]
export const getPendingProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const pendingProducts = await prisma.product.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    ResponseApi.success(
      res,
      "Pending products retrieved successfully",
      pendingProducts
    );
  } catch (error: any) {
    ResponseApi.error(
      res,
      "Failed to retrieve pending products",
      error.message
    );
  }
};

// ✅ NOUVEAU: Endpoint pour que les utilisateurs récupèrent leurs propres produits en attente
export const getUserPendingProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.authUser?.id;

    if (!userId) {
      return ResponseApi.error(res, "User not authenticated", null, 401);
    }

    const userPendingProducts = await prisma.product.findMany({
      where: {
        status: "PENDING",
        userId: userId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // ✅ CORRECTION: Transformation des images en URLs complètes comme dans les autres endpoints
    const userPendingProductsWithImageUrls =
      ProductTransformer.transformProducts(req, userPendingProducts);

    ResponseApi.success(res, "User pending products retrieved successfully", {
      products: userPendingProductsWithImageUrls,
      links: {
        total: userPendingProductsWithImageUrls.length,
      },
    });
  } catch (error: any) {
    ResponseApi.error(
      res,
      "Failed to retrieve user pending products",
      error.message
    );
  }
};

export const getProductById = async (
  req: Request,
  res: Response
): Promise<any> => {
  ``;
  const id = req.params.id;
  try {
    if (!id) {
      return ResponseApi.notFound(res, "id is not found", 422);
    }
    const result = await prisma.product.findFirst({
      where: {
        id,
      },
      include: {
        category: true,
        city: true,
        user: true, // Inclure les données de l'utilisateur
      },
    });
    if (!result) {
      return ResponseApi.notFound(res, "Product not found", 404);
    }

    const productWithImageUrls = ProductTransformer.transformProduct(
      req,
      result
    );

    ResponseApi.success(
      res,
      "Product retrieved successfully",
      productWithImageUrls
    );
  } catch (error: any) {
    ResponseApi.error(res, "Failed to get product by ID", error.message);
  }
};

export const createProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      name,
      price,
      quantity,
      description,
      categoryId,
      cityId,
      etat,
      quartier,
      telephone,
      forfaitType,
    } = req.body;
    if (!req.authUser?.id) {
      return ResponseApi.error(res, "User not authenticated", null, 401);
    }
    const userId = req.authUser?.id;

    // Validation basique
    if (
      !name ||
      !price ||
      !quantity ||
      !description ||
      !categoryId ||
      !cityId ||
      !etat
    ) {
      return ResponseApi.error(res, "Tous les champs sont requis", null, 400);
    }

    // 🔐 Upload sécurisé des images avec optimisation
    if (!req.files || !req.files.images) {
      return ResponseApi.error(
        res,
        "Au moins une image est requise",
        null,
        400
      );
    }

    // Utilisation du système d'upload sécurisé
    const savedImages = await uploadProductImages(req);

    // Création du produit
    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        description,
        images: savedImages,
        categoryId,
        userId,
        cityId,
        status: "PENDING",
        etat,
        quartier,
        telephone,
      },
    });

    // Si le frontend a demandé un forfait lors de la création
    if (forfaitType) {
      const forfait = await prisma.forfait.findFirst({
        where: { type: forfaitType },
      });
      if (forfait) {
        // Créer réservation (isActive=false)
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + forfait.duration * 24 * 60 * 60 * 1000
        );
        const productForfait = await prisma.productForfait.create({
          data: {
            productId: product.id,
            forfaitId: forfait.id,
            activatedAt: now,
            expiresAt,
            isActive: false,
          },
        });

        const transactionData = {
          currency: "XAF",
          amount: forfait.price,
          customer_transaction_id: productForfait.id,
          country_code: "CM",
          customer_first_name: req.authUser?.firstName || "Client",
          customer_last_name: req.authUser?.lastName || "",
          customer_phone: req.body.telephone || product.telephone || "",
          customer_email: req.authUser?.email || "",
        };

        const securedUrl = initiateFuturaPayment(transactionData);
        const productResponse = ProductTransformer.transformProduct(
          req,
          product
        );
        return ResponseApi.success(
          res,
          "Produit créé - paiement forfait requis",
          {
            product: productResponse,
            paymentUrl: securedUrl,
            productForfaitId: productForfait.id,
          },
          201
        );
      }
    }

    if (userId) {
      await createNotification(
        userId,
        "Annonce créée avec succès",
        `Votre produit "${name}" a été créé avec succès et est en attente de validation par nos équipes...`,
        {
          type: "PRODUCT",
          link: `/product/${product.id}`,
        }
      );
    }
    const productResponse = ProductTransformer.transformProduct(req, product);

    // 🚀 CACHE: Invalider le cache après création d'un produit
    cacheService.invalidateHomepageProducts();

    ResponseApi.success(res, "Produit créé avec succès", productResponse, 201);
  } catch (error: any) {
    ResponseApi.error(
      res,
      "Erreur lors de la création du produit",
      error.message
    );
  }
};

export const updateProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  const id = req.params.id;
  try {
    if (!id) {
      return ResponseApi.notFound(res, "id is not found", 422);
    }

    const existingProduct = await prisma.product.findFirst({ where: { id } });
    if (!existingProduct) {
      return ResponseApi.notFound(res, "Product not found", 404);
    }

    const { name, price, quantity, description, categoryId, userId, cityId } =
      req.body;

    // Gestion des images (upload)
    let images = existingProduct.images as string[];
    if (req.files && req.files.images) {
      let newImages = req.files.images;
      // 🔐 Upload sécurisé des nouvelles images
      if (!Array.isArray(newImages)) newImages = [newImages];

      // Supprimer les anciennes images si besoin
      for (const oldImg of images) {
        await Utils.deleteFile(oldImg);
      }

      // Utilisation du système d'upload sécurisé
      images = await uploadProductImages(req);
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name ?? existingProduct.name,
        price: price ? parseFloat(price) : existingProduct.price,
        quantity: quantity ? parseInt(quantity) : existingProduct.quantity,
        description: description ?? existingProduct.description,
        images,
        categoryId: categoryId ?? existingProduct.categoryId,
        userId: userId ?? existingProduct.userId,
        cityId: cityId ?? existingProduct.cityId,
      },
    });

    // Si un forfait est demandé à la mise à jour
    const { forfaitType } = req.body;
    if (forfaitType) {
      const forfait = await prisma.forfait.findFirst({
        where: { type: forfaitType },
      });
      if (forfait) {
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + forfait.duration * 24 * 60 * 60 * 1000
        );
        const productForfait = await prisma.productForfait.create({
          data: {
            productId: updatedProduct.id,
            forfaitId: forfait.id,
            activatedAt: now,
            expiresAt,
            isActive: false,
          },
        });

        const transactionData = {
          currency: "XAF",
          amount: forfait.price,
          customer_transaction_id: productForfait.id,
          country_code: "CM",
          customer_first_name: req.authUser?.firstName || "Client",
          customer_last_name: req.authUser?.lastName || "",
          customer_phone: req.body.telephone || updatedProduct.telephone || "",
          customer_email: req.authUser?.email || "",
        };

        const securedUrl = initiateFuturaPayment(transactionData);
        const productWithImageUrls = ProductTransformer.transformProduct(
          req,
          updatedProduct
        );
        return ResponseApi.success(
          res,
          "Produit mis à jour - paiement forfait requis",
          {
            product: productWithImageUrls,
            paymentUrl: securedUrl,
            productForfaitId: productForfait.id,
          }
        );
      }
    }

    const productWithImageUrls = ProductTransformer.transformProduct(
      req,
      updatedProduct
    );

    // 🚀 CACHE: Invalider le cache après mise à jour d'un produit
    cacheService.invalidateHomepageProducts();

    ResponseApi.success(
      res,
      "Produit mis à jour avec succès",
      productWithImageUrls
    );
  } catch (error: any) {
    ResponseApi.error(
      res,
      "Erreur lors de la mise à jour du produit",
      error.message
    );
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  const id = req.params.id;
  try {
    if (!id) {
      return ResponseApi.notFound(res, "id is not found", 422);
    }
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return ResponseApi.notFound(res, "Product not found", 404);
    }

    // Supprimer les images associées
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (typeof img === "string") {
          await Utils.deleteFile(img);
        }
      }
    }

    // Suppression du produit et de ses dépendances (cascade automatique)
    // seront automatiquement supprimés
    const result = await prisma.product.delete({
      where: { id },
    });
    ResponseApi.success(res, "Product deleted successfully", result);
  } catch (error: any) {
    ResponseApi.error(res, "Failed to delete product", error.message);
  }
};

export const reviewProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    // ✅ 1. Validation et récupération des données en parallèle
    const [product] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: { user: true },
      }),
      // Récupération des informations du produit
    ]);

    if (!product) {
      return ResponseApi.notFound(res, "Product not found", 404);
    }

    // ✅ 2. Préparation des données (synchrone - très rapide)
    let newStatus: "VALIDATED" | "REJECTED" | null = null;
    let subject = "";
    let message = "";

    if (action === "validate") {
      newStatus = "VALIDATED";
      subject = "Votre produit a été validé";
      message =
        "Félicitations ! Votre produit a été validé et est désormais visible sur la plateforme.";
    } else if (action === "reject") {
      newStatus = "REJECTED";
      subject = "Votre produit a été rejeté";
      message =
        "Nous sommes désolés, votre produit a été rejeté. Veuillez vérifier les informations et réessayer.";
    } else {
      return ResponseApi.error(res, "Invalid action", null, 400);
    }

    // ✅ 3. Mise à jour du produit (opération critique - doit être synchrone)
    await prisma.product.update({
      where: { id },
      data: { status: newStatus },
    });

    // ✅ 4. RÉPONSE IMMÉDIATE au client (performance critique)
    const response = ResponseApi.success(
      res,
      `Product ${
        newStatus === "VALIDATED" ? "validated" : "rejected"
      } successfully`,
      null
    );

    // ✅ 5. Tâches d'arrière-plan APRÈS la réponse (non-bloquantes)
    // Utilisation de setImmediate/process.nextTick pour éviter de bloquer la réponse
    setImmediate(async () => {
      try {
        const backgroundTasks = [];

        // Création notification (en parallèle)
        if (product.user?.id) {
          const notifTitle =
            newStatus === "VALIDATED" ? "Produit validé" : "Produit rejeté";
          const notifMessage =
            newStatus === "VALIDATED"
              ? `Votre produit "${product.name}" a été validé.`
              : `Votre produit "${product.name}" a été rejeté.`;

          backgroundTasks.push(
            createNotification(product.user.id, notifTitle, notifMessage, {
              type: "PRODUCT",
              link: `/product/${id}`,
            })
          );
        }

        // Envoi email (en parallèle)
        if (product.user?.email) {
          const html = reviewProductTemplate({
            userName: product.user.firstName || "Utilisateur",
            productName: product.name,
            status: newStatus,
            message,
          });

          backgroundTasks.push(
            sendEmail(product.user.email, subject, message, html)
          );
        }

        // ✅ Exécution parallèle des tâches d'arrière-plan
        await Promise.allSettled(backgroundTasks);
      } catch (bgError) {
        // Log l'erreur mais ne pas faire échouer la requête principale
        console.error("Background task error in reviewProduct:", bgError);
      }
    });

    return response;
  } catch (error: any) {
    return ResponseApi.error(res, "Failed to review product", error.message);
  }
};

// Méthode pour supprimer tous les produits d'un utilisateur suspendu
export const deleteProductOfSuspendedUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { userId } = req.body;

  try {
    // Validation de l'entrée
    if (!userId) {
      return ResponseApi.error(res, "L'ID utilisateur est requis", null, 400);
    }

    // Vérifier que l'utilisateur est bien suspendu
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, firstName: true, lastName: true },
    });

    if (!user) {
      return ResponseApi.notFound(res, "Utilisateur non trouvé", 404);
    }

    if (user.status !== "SUSPENDED") {
      return ResponseApi.error(
        res,
        "Cette action n'est possible que pour les utilisateurs suspendus",
        null,
        400
      );
    }

    // Récupérer d'abord tous les produits pour supprimer les images
    const products = await prisma.product.findMany({
      where: { userId },
      select: { id: true, images: true },
    });

    if (products.length === 0) {
      return ResponseApi.success(
        res,
        "Aucun produit trouvé pour cet utilisateur suspendu",
        { count: 0 }
      );
    }

    // Supprimer les images associées
    const imagePromises = products.flatMap((product) => {
      const images = product.images as string[];
      return images.map((img) => Utils.deleteFile(img));
    });

    // Attendre que toutes les suppressions d'images soient terminées
    await Promise.allSettled(imagePromises);

    // Supprimer tous les produits
    const result = await prisma.product.deleteMany({
      where: { userId },
    });

    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : "l'utilisateur suspendu";
    return ResponseApi.success(
      res,
      `${result.count} produits de ${userName} ont été supprimés avec succès`,
      { count: result.count }
    );
  } catch (error: any) {
    return ResponseApi.error(
      res,
      "Échec de la suppression des produits de l'utilisateur suspendu",
      error.message
    );
  }
};

export const getHomePageProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  // Priorité des forfaits (1 = plus prioritaire)
  // Ordre: A_LA_UNE > PREMIUM > TOP_ANNONCE > URGENT > Produits classiques
  const priorities: ForfaitType[] = [
    ForfaitType.A_LA_UNE,
    ForfaitType.PREMIUM,
    ForfaitType.TOP_ANNONCE,
    ForfaitType.URGENT,
  ];
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    // 🚀 CACHE: Vérifier d'abord si les données sont en cache
    const cachedData = cacheService.getHomepageProducts(limit);
    if (cachedData) {
      return ResponseApi.success(
        res,
        "Produits homepage récupérés avec succès (cache)",
        cachedData
      );
    }

    let products: any[] = [];
    let usedPriority: string | null = null;

    // On parcourt les priorités dans l'ordre
    for (const type of priorities) {
      products = await prisma.product.findMany({
        where: {
          status: "VALIDATED",
          productForfaits: {
            some: {
              isActive: true,
              expiresAt: { gt: new Date() },
              forfait: { type },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          category: true,
          city: true,
          user: true,
          productForfaits: {
            where: { isActive: true, expiresAt: { gt: new Date() } },
            include: { forfait: true },
          },
        },
      });
      if (products.length > 0) {
        usedPriority = type;
        break;
      }
    }

    // Si aucun produit avec forfait, prendre les produits validés les plus récents
    if (products.length === 0) {
      products = await prisma.product.findMany({
        where: { status: "VALIDATED" },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          category: true,
          city: true,
          user: true,
          productForfaits: {
            where: { isActive: true, expiresAt: { gt: new Date() } },
            include: { forfait: true },
          },
        },
      });
      usedPriority = null;
    }

    // Conversion des images en URLs complètes
    const productsWithImageUrls =
      ProductTransformer.transformProductsWithForfaits(req, products);

    const responseData = {
      products: productsWithImageUrls,
      usedPriority,
    };

    // 🚀 CACHE: Mettre en cache le résultat
    cacheService.setHomepageProducts(limit, responseData);

    ResponseApi.success(
      res,
      "Produits homepage récupérés avec succès",
      responseData
    );
  } catch (error: any) {
    ResponseApi.error(
      res,
      "Erreur lors de la récupération des produits homepage",
      error.message
    );
  }
};
