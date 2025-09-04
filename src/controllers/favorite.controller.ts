import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import Utils from "../helper/utils.js";
import { createNotification } from "../services/notification.service.js";

export const addToFavorites = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.authUser?.id;
    const { productId } = req.body;

    if (!userId || !productId) {
      return ResponseApi.error(
        res,
        "userId et productId sont requis",
        null,
        400
      );
    }

    // Vérifie si le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { user: true }, // Inclure le propriétaire du produit
    });
    if (!product) {
      return ResponseApi.notFound(res, "Produit introuvable", 404);
    }

    // Vérifie si déjà en favoris
    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      return ResponseApi.error(res, "Produit déjà dans les favoris", null, 400);
    }

    const favorite = await prisma.favorite.create({
      data: { userId, productId },
      include: { product: true, user: true }, // Inclure le produit et l'utilisateur
    });

    // 🔧 Conversion sécurisée des images en URLs complètes
    const favoriteWithImageUrls = {
      ...favorite,
      product: favorite.product
        ? {
            ...favorite.product,
            images: Array.isArray(favorite.product.images)
              ? (favorite.product.images as string[]).map((imagePath: string) =>
                  Utils.resolveFileUrl(req, imagePath)
                )
              : [],
          }
        : null,
    };

    // Envoyer une notification au propriétaire du produit (si différent de l'utilisateur)
    if (product.userId && product.userId !== userId) {
      const userName = favorite.user?.firstName || "Un utilisateur";
      const productName = product.name || "votre produit";
      
      await createNotification(
        product.userId,
        "Nouveau favori",
        `${userName} a ajouté ${productName} à ses favoris`,
        {
          type: "favorite",
          link: `/products/${productId}`,
          data: { 
            productId,
            userId,
            productName: product.name
          }
        }
      );
    }

    ResponseApi.success(
      res,
      "Produit ajouté aux favoris",
      favoriteWithImageUrls,
      201
    );
  } catch (error: any) {
    ResponseApi.error(res, "Erreur lors de l'ajout aux favoris", error.message);
  }
};

export const removeFromFavorites = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.authUser?.id;
    const { productId } = req.body;

    if (!userId || !productId) {
      return ResponseApi.error(
        res,
        "userId et productId sont requis",
        null,
        400
      );
    }

    // Vérifie si le produit est en favoris
    const favorite = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!favorite) {
      return ResponseApi.notFound(
        res,
        "Produit non trouvé dans les favoris",
        404
      );
    }

    await prisma.favorite.delete({
      where: { userId_productId: { userId, productId } },
    });

    ResponseApi.success(res, "Produit retiré des favoris", null, 200);
  } catch (error: any) {
    ResponseApi.error(res, "Erreur lors du retrait des favoris", error.message);
  }
};

export const getUserFavorites = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.authUser?.id;

    if (!userId) {
      return ResponseApi.error(res, "userId requis", null, 400);
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { product: true }, // Inclut les infos du produit
    });

    // 🔧 Conversion sécurisée des images en URLs complètes pour chaque produit favori
    const favoritesWithImageUrls = favorites.map((fav) => ({
      ...fav,
      product: fav.product
        ? {
            ...fav.product,
            images: Array.isArray(fav.product.images)
              ? (fav.product.images as string[]).map((imagePath: string) =>
                  Utils.resolveFileUrl(req, imagePath)
                )
              : [],
          }
        : null,
    }));

    ResponseApi.success(
      res,
      "Favoris récupérés avec succès",
      favoritesWithImageUrls,
      200
    );
  } catch (error: any) {
    ResponseApi.error(
      res,
      "Erreur lors de la récupération des favoris",
      error.message
    );
  }
};
