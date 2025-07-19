import { Request, Response } from "express";
// @ts-ignore
import type { File as MulterFile } from 'multer';
export interface MulterRequest extends Request {
  files?: MulterFile[];
  user?: { id: string };
}
import prisma from "../model/prisma.client";
import ResponseApi from "../helper/response";
import { uploadProductImages } from "../utilities/upload";

export const getAllProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  const limit = parseInt(req.query.limit as string) || 10;
  const page = parseInt(req.query.page as string) || 1;
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || "";

  try {
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: search,
        },
      },
      skip: skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        category: true,
      },
    });

    const totalProducts = await prisma.product.count({
      where: {
        name: {
          contains: search,
        },
      },
    });

    const totalPages = Math.ceil(totalProducts / limit);

    ResponseApi.success(res, "Products retrieved successfully", {
      products,
      pagination: {
        totalProducts,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching products" });
  }
};

export const getProductById = async (
  req: Request,
  res: Response
): Promise<any> => {
  const id = req.params.id;
  try {
    // Vérifier si l'ID est valide
    if (!id) {
      return ResponseApi.notFound(res, "Product ID is required");
    }
    // Récupérer le produit par ID
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
    // Vérifier si le produit existe
    if (!product) {
      return ResponseApi.notFound(res, "Product not found");
    }
    ResponseApi.success(res, "Product retrieved successfully", product);
  } catch (error) {
    console.error("Error in getProductById:", error);
    ResponseApi.error(res, "An error occurred while fetching the product", 500);
  }
};

// export const createProduct = async (
//   req: Request,
//   res: Response
// ): Promise<any> => {
//   const { name, description, price, categoryId, cityId, quantity } = req.body;
//   const files = (req as MulterRequest).files as MulterFile[];

//   try {
//     if (!name || !description || !price || !categoryId || !cityId || !quantity) {
//       return ResponseApi.notFound(res, "All fields are required");
//     }
//     if (!files || files.length < 1 || files.length > 5) {
//       return ResponseApi.error(res, "A product must have between 1 and 5 images", 400);
//     }
//     const images: string[] = files.map(file => `/uploads/products/${file.filename}`);

//     const newProduct = await prisma.product.create({
//       data: {
//         name,
//         description,
//         price,
//         quantity, 
//         categoryId,
//         cityId,
//         images,
//         userId: req.user?.id,
//       },
//     });

//     ResponseApi.success(res, "Product created successfully", newProduct, 201);
//   } catch (error) {
//     console.error("Error in createProduct:", error);
//     ResponseApi.error(res, "An error occurred while creating the product", 500);
//   }
// };


export const updateProduct = async(
    req: Request,
    res: Response
): Promise<any> => {
    const id = req.params.id;
    const { name, description, price, categoryId, cityId, quantity } = req.body;
    const files = (req as MulterRequest).files as MulterFile[];
    try {
        if (!id) {
            return ResponseApi.notFound(res,"Product ID is required");
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id },
        });
        if (!existingProduct) {
            return ResponseApi.notFound(res, "Product not found");
        }

        let images: string[];
        if (files && files.length > 0) {
            if (files.length < 1 || files.length > 5) {
                return ResponseApi.error(res, "A product must have between 1 and 5 images", 400);
            }
            images = files.map(file => `/uploads/products/${file.filename}`);
        } else {
            images = existingProduct.images as string[];
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                name,
                description,
                price,
                categoryId,
                cityId,
                images,
                quantity,
            },
        });

        ResponseApi.success(res, "Product updated successfully", updatedProduct);
    } catch (error) {
        console.error("Error in updateProduct:", error);
        ResponseApi.error(res, "An error occurred while updating the product", 500);
    }
}


export const deleteProduct = async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id;
  try {
    // Vérifier si l'ID est valide
    if (!id) {
      return ResponseApi.notFound(res, "Product ID is required");
    }

    // Vérifier si le produit existe
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      return ResponseApi.notFound(res, "Product not found");
    }

    // Supprimer le produit
    const product = await prisma.product.delete({
      where: { id },
    });

    ResponseApi.success(res, "Product deleted successfully", product, 204);
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    ResponseApi.error(res, "An error occurred while deleting the product", 500);
  }
}