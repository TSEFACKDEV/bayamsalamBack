import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import Utils from "../helper/utils.js";
import { sendEmail } from "../utilities/mailer.js";
import { reviewProductTemplate } from "../templates/reviewProductTemplate.js";
import { createNotification } from "../services/notification.service.js";
// pour recuperer tous les produits avec pagination  [ce ci sera pour les administrateurs]
// ✅ UPDATED: Ajout du support du filtrage par status
export const getAllProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || "";
  const status = req.query.status as string; // ✅ Récupérer le paramètre status

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

    // Pour chaque produit, calculer la somme des points reçus par le user qui a posté le produit
    const productsWithUserPoints = await Promise.all(
      products.map(async (product) => {
        // On suppose que la table review a un champ userId qui correspond au propriétaire du produit
        const userReviews = await prisma.review.findMany({
          where: { userId: product.userId },
        });
        const totalPoints = userReviews.reduce(
          (sum, r) => sum + (r.rating || 0),
          0
        );
        const averagePoints =
          userReviews.length > 0 ? totalPoints / userReviews.length : null;
        return {
          ...product,
          // 🔧 Conversion sécurisée des images en URLs complètes avec vérification TypeScript
          images: Array.isArray(product.images)
            ? (product.images as string[]).map((imagePath: string) =>
                Utils.resolveFileUrl(req, imagePath)
              )
            : [], // Tableau vide si pas d'images
          userTotalPoints: totalPoints,
          userAveragePoints: averagePoints,
        };
      })
    );

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
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failed to get all products", error.message);
  }
};

//pour recuperer tous les produits sans pagination [pour le developpeur]

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
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(res, "Failed to get all products", error.message);
  }
};

//pour recuperer tous les produits avec un status = VALIDATED, pagination et recherche [pour les utilisateurs]

export const getValidatedProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || "";
  const categoryId = req.query.categoryId as string; // ✅ Ajout du filtre catégorie
  const cityId = req.query.cityId as string; // ✅ Ajout du filtre ville

  try {
    const where: any = { status: "VALIDATED" };
    if (search) {
      // MODIFIÉ: Supprimé mode "insensitive" car non supporté par MySQL - utilise contains simple
      where.name = { contains: search };
    }

    // ✅ Ajout des filtres par catégorie et ville
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (cityId) {
      where.cityId = cityId;
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
        productForfaits: {
          where: { isActive: true, expiresAt: { gt: new Date() } },
          include: { forfait: true },
        },
      },
    });

    const total = await prisma.product.count({ where });

    // 🔧 Conversion sécurisée des images en URLs complètes avec vérification TypeScript pour les produits validés
    const productsWithImageUrls = products.map((product) => ({
      ...product,
      images: Array.isArray(product.images)
        ? (product.images as string[]).map((imagePath: string) =>
            Utils.resolveFileUrl(req, imagePath)
          )
        : [], // Tableau vide si pas d'images
    }));

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
    console.log("====================================");
    console.log(error);
    console.log("====================================");
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
    console.log("====================================");
    console.log(error);
    console.log("====================================");
    ResponseApi.error(
      res,
      "Failed to retrieve pending products",
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

    // 🔧 Conversion sécurisée des images en URLs complètes avec vérification TypeScript
    const productWithImageUrls = {
      ...result,
      images: Array.isArray(result.images)
        ? (result.images as string[]).map((imagePath: string) =>
            Utils.resolveFileUrl(req, imagePath)
          )
        : [], // Tableau vide si pas d'images
    };

    ResponseApi.success(
      res,
      "Product retrieved successfully",
      productWithImageUrls
    );
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
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

    const userId = req.user?.id;

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

    // Gestion des images (upload)
    if (!req.files || !req.files.images) {
      return ResponseApi.error(
        res,
        "Au moins une image est requise",
        null,
        400
      );
    }

    let images = req.files.images;
    if (!Array.isArray(images)) images = [images];

    if (images.length < 1 || images.length > 5) {
      return ResponseApi.error(
        res,
        "Un produit doit avoir entre 1 et 5 images",
        null,
        400
      );
    }

    // Sauvegarde des images et récupération des chemins
    const savedImages: string[] = [];
    for (const img of images) {
      const savedPath = await Utils.saveFile(img, "products");
      savedImages.push(savedPath);
    }

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
        status: "PENDING", // Statut par défaut
        etat,
        quartier,
        telephone,
      },
    });

    // 🔧 Conversion sécurisée des chemins relatifs en URLs complètes avec vérification TypeScript pour la réponse
    const productResponse = {
      ...product,
      images: Array.isArray(product.images)
        ? (product.images as string[]).map((imagePath: string) =>
            Utils.resolveFileUrl(req, imagePath)
          )
        : [], // Tableau vide si pas d'images
    };

    ResponseApi.success(res, "Produit créé avec succès", productResponse, 201);
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
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
      if (!Array.isArray(newImages)) newImages = [newImages];

      // Supprimer les anciennes images si besoin
      for (const oldImg of images) {
        await Utils.deleteFile(oldImg);
      }

      // Sauvegarder les nouvelles images
      images = [];
      for (const img of newImages) {
        const savedPath = await Utils.saveFile(img, "products");
        images.push(savedPath);
      }
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

    // 🔧 Conversion sécurisée des images en URLs complètes avec vérification TypeScript pour la réponse
    const productWithImageUrls = {
      ...updatedProduct,
      images: Array.isArray(updatedProduct.images)
        ? (updatedProduct.images as string[]).map((imagePath: string) =>
            Utils.resolveFileUrl(req, imagePath)
          )
        : [], // Tableau vide si pas d'images
    };

    ResponseApi.success(
      res,
      "Produit mis à jour avec succès",
      productWithImageUrls
    );
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
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

    // Grâce à onDelete: Cascade dans le schéma, les favoris et forfaits
    // seront automatiquement supprimés
    const result = await prisma.product.delete({
      where: { id },
    });
    ResponseApi.success(res, "Product deleted successfully", result);
  } catch (error: any) {
    console.log("====================================");
    console.log(error);
    console.log("====================================");
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
      // On peut ajouter d'autres vérifications en parallèle ici si besoin
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
    console.log("====================================");
    console.log("Error in reviewProduct:", error);
    console.log("====================================");
    return ResponseApi.error(res, "Failed to review product", error.message);
  }
};
