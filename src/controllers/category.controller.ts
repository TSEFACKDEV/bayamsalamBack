import { promises } from 'dns';
import { Request, Response } from 'express';
import ResponseApi from '../helper/response.js';
import prisma from '../model/prisma.client.js';

//creation de category
export const createCategory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { name, description } = req.body;
    //verifions si la categorie existe deja
    const existingCategory = await prisma.category.findFirst({
      where: { name: { equals: name } },
    });

    if (existingCategory) {
      return ResponseApi.notFound(res, 'Category Already exist');
    }

    //creer la category
    const category = await prisma.category.create({
      data: {
        name,
        description,
      },
    });

    ResponseApi.success(res, 'Category create succesfully', category);
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, 'Failled to create Category', error);
  }
};

//obtenir toutes les category

export const getAllCategories = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Recherche
    const search = (req.query.search as string) || '';

    // Construction du filtre de recherche - Compatible MySQL
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Récupération des catégories paginées et filtrées avec enrichissement
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
      prisma.category.count({ where }),
    ]);

    // Enrichir les données des catégories
    const enrichedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: null, // Pas encore défini dans le schéma
      color: '#f97316', // Couleur par défaut orange
      isActive: true, // Valeur par défaut (toutes actives)
      productCount: category._count.products,
      parentId: null, // Pas de hiérarchie pour l'instant
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    }));

    const totalPages = Math.ceil(total / limit);

    ResponseApi.success(res, 'Categories retrieved succesfully', {
      categories: enrichedCategories,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, 'Failled to fetch all categories', error);
  }
};

//obtenir une category en fonction de son id
export const getCategoryById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    //verification de l'id
    if (!id) {
      return ResponseApi.notFound(res, 'Id is not Found');
    }

    //recuperation de la category
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            price: true,
            city: true,
            images: true,
            createdAt: true,
          },
        },
      },
    });
    if (!category) {
      return ResponseApi.notFound(res, 'category not Found');
    }

    ResponseApi.success(res, 'Category retrieved succesfully', category);
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, 'Failled to get category', error);
  }
};

//mise a jour de la category
export const updateCategory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    //verification de l'id
    if (!id) {
      return ResponseApi.notFound(res, 'Id is not Found');
    }

    //verifions si la categorie existe (par ID, pas par nom!)
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return ResponseApi.notFound(res, 'Category not Found');
    }

    // Vérifier si le nouveau nom est déjà utilisé (seulement si le nom change)
    if (name && name.toLowerCase() !== existingCategory.name.toLowerCase()) {
      const nameExists = await prisma.category.findFirst({
        where: { name: { equals: name }, NOT: { id } },
      });
      if (nameExists) {
        return ResponseApi.notFound(res, 'category name already in use');
      }
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
      },
    });
    ResponseApi.success(res, 'category update succesfully', category);
  } catch (error) {
    console.log('Failled to update category');
  }
};

//suprimer une category
export const deleteCategory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    //verifions si la categorie existe
    const existingCategory = await prisma.category.findFirst({
      where: { id },
    });

    if (!existingCategory) {
      return ResponseApi.notFound(res, 'Category not Found');
    }
    // Vérifier si la catégorie contient des produits
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      return ResponseApi.notFound(
        res,
        'impossible to Delete Category who have a product'
      );
    }
    // Supprimer la catégorie
    const category = await prisma.category.delete({ where: { id } });
    ResponseApi.success(res, 'category Delete succesfully', category);
  } catch (error) {
    console.log(error);
    ResponseApi.error(res, 'Failled to delete category', error);
  }
};
