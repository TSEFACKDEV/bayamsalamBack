import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";

export const getAllReviews = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    ResponseApi.success(res, "Reviews retrieved successfully", reviews);
  } catch (error) {
    console.error("Error retrieving reviews:", error);
    ResponseApi.error(res, "Failed to retrieve reviews", 500);
  }
};

export const getReviewById = async (
  req: Request,
  res: Response
): Promise<any> => {
  const id = req.params.id;
  try {
    if (!id) {
      return ResponseApi.error(res, "Review ID is required", null, 422);
    }
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
    if (!review) {
      return ResponseApi.notFound(res, "Review not found", 404);
    }
    ResponseApi.success(res, "Review retrieved successfully", review);
  } catch (error) {
    console.error("Error retrieving review:", error);
    ResponseApi.error(res, "Failed to retrieve review", 500);
  }
};

export const createReview = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { sellerId, rating } = req.body; // On utilise sellerId directement au lieu de productId
  const userId = req.user?.id; // Celui qui laisse la note

  try {
    if (!sellerId || !rating) {
      return ResponseApi.error(
        res,
        "Seller ID and rating are required",
        null,
        400
      );
    }

    if (rating < 1 || rating > 5) {
      return ResponseApi.error(
        res,
        "Rating must be between 1 and 5",
        null,
        400
      );
    }

    // Vérifier que l'utilisateur ne se note pas lui-même
    if (userId === sellerId) {
      return ResponseApi.error(res, "You cannot rate yourself", null, 400);
    }

    // Vérifier que le vendeur existe
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return ResponseApi.notFound(res, "Seller not found", 404);
    }

    // Vérifier si l'utilisateur a déjà noté ce vendeur
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: userId,
        authorId: sellerId,
      },
    });

    if (existingReview) {
      return ResponseApi.error(
        res,
        "You have already rated this seller",
        null,
        400
      );
    }

    const review = await prisma.review.create({
      data: {
        authorId: sellerId,
        userId,
        rating,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    ResponseApi.success(res, "Review created successfully", review, 201);
  } catch (error) {
    console.error("Error creating review:", error);
    ResponseApi.error(res, "Failed to create review", 500);
  }
};

export const updateReview = async (
  req: Request,
  res: Response
): Promise<any> => {
  const id = req.params.id;
  const { rating } = req.body;
  const userId = req.user?.id;

  try {
    if (!id) {
      return ResponseApi.error(res, "Review ID is required", null, 422);
    }

    if (!rating || rating < 1 || rating > 5) {
      return ResponseApi.error(
        res,
        "Valid rating (1-5) is required",
        null,
        400
      );
    }

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return ResponseApi.notFound(res, "Review not found", 404);
    }

    // Vérifier que l'utilisateur ne peut modifier que ses propres reviews
    if (review.userId !== userId) {
      return ResponseApi.error(
        res,
        "You can only update your own reviews",
        null,
        403
      );
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        rating,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    ResponseApi.success(res, "Review updated successfully", updatedReview);
  } catch (error) {
    console.error("Error updating review:", error);
    ResponseApi.error(res, "Failed to update review", 500);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response
): Promise<any> => {
  const id = req.params.id;
  const userId = req.user?.id;

  try {
    if (!id) {
      return ResponseApi.error(res, "Review ID is required", null, 422);
    }

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return ResponseApi.notFound(res, "Review not found", 404);
    }

    // Vérifier que l'utilisateur ne peut supprimer que ses propres reviews
    if (review.userId !== userId) {
      return ResponseApi.error(
        res,
        "You can only delete your own reviews",
        null,
        403
      );
    }

    await prisma.review.delete({
      where: { id },
    });

    ResponseApi.success(res, "Review deleted successfully", null);
  } catch (error) {
    console.error("Error deleting review:", error);
    ResponseApi.error(res, "Failed to delete review", 500);
  }
};

export const getReviewsForUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  const sellerId = req.params.userId;
  try {
    if (!sellerId) {
      return ResponseApi.error(res, "Seller ID is required", null, 422);
    }

    // Vérifier que le vendeur existe
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    if (!seller) {
      return ResponseApi.notFound(res, "Seller not found", 404);
    }

    // Récupérer toutes les reviews pour ce vendeur
    const reviews = await prisma.review.findMany({
      where: { authorId: sellerId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculer la moyenne et les statistiques
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10
          ) / 10
        : 0;

    // Calculer la répartition des étoiles
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    ResponseApi.success(res, "Seller reviews retrieved successfully", {
      seller,
      reviews,
      statistics: {
        totalReviews,
        averageRating,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error("Error retrieving reviews for seller:", error);
    ResponseApi.error(res, "Failed to retrieve reviews for seller", 500);
  }
};

export const getReviewsByUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  const userId = req.user?.id;
  try {
    // Récupérer toutes les reviews données par cet utilisateur
    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    ResponseApi.success(res, "Your reviews retrieved successfully", reviews);
  } catch (error) {
    console.error("Error retrieving user reviews:", error);
    ResponseApi.error(res, "Failed to retrieve your reviews", 500);
  }
};
