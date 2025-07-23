import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
import Utils from "../helper/utils.js";

export const getAllProducts = async (
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
            name: { contains: search },
          },
    };
    const result = await prisma.product.findMany(params);
    const total = await prisma.product.count(params);
    ResponseApi.success(res, "product retrieved succesfully !!!", {
      products: result,
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
    ResponseApi.error(res, "failled to getAll products", error.message);
  }
};

export const getProductById = async (
  req: Request,
  res: Response
): Promise<any> => {
  const id = req.params.id;
  try {
    if (!id) {
      return ResponseApi.notFound(res, "id is not found", 422);
    }
    const result = await prisma.product.findFirst({
      where: {
        id,
      },
    });
    if (!result) {
      return ResponseApi.notFound(res, "Product not found", 404);
    }
    ResponseApi.success(res, "Product retrieved successfully", result);
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
    const { name, price, quantity, description, categoryId, userId, cityId } =
      req.body;

    // Validation basique
    if (
      !name ||
      !price ||
      !quantity ||
      !description ||
      !categoryId ||
      !userId ||
      !cityId
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
      },
    });

    ResponseApi.success(res, "Produit créé avec succès", product, 201);
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

    const existingProduct = await prisma.product.findUnique({ where: { id } });
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

    ResponseApi.success(res, "Produit mis à jour avec succès", updatedProduct);
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
