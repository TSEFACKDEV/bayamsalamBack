import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";

export const getAllReviews = async( req: Request, res: Response): Promise<any> => {
    try {
        const reviews = await prisma.review.findMany({
        include: {
            user: true,
            product: true,
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
}

export const getReviewById = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "Review ID is required", 422);
        }
        const review = await prisma.review.findUnique({
            where: { id },
            include: {
                user: true,
                product: true,
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


export const createReview = async (req: Request, res: Response): Promise<any> => {
    const { productId, rating, comment } = req.body;
    const userId = req.user?.id; // Assuming user ID is stored in req.user

    try {
        if (!productId || !rating || !comment) {
            return ResponseApi.error(res, "All fields are required", null, 400);
        }

        const review = await prisma.review.create({
            data: {
                productId,
                userId,
                rating,
                comment,
            },
        });

        ResponseApi.success(res, "Review created successfully", review, 201);
    } catch (error) {
        console.error("Error creating review:", error);
        ResponseApi.error(res, "Failed to create review", 500);
    }
};



export const updateReview = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    const { rating, comment } = req.body;

    try {
        if (!id) {
            return ResponseApi.notFound(res, "Review ID is required", 422);
        }

        const review = await prisma.review.findUnique({
            where: { id },
        });

        if (!review) {
            return ResponseApi.notFound(res, "Review not found", 404);
        }

        const updatedReview = await prisma.review.update({
            where: { id },
            data: {
                rating,
                comment,
            },
        });

        ResponseApi.success(res, "Review updated successfully", updatedReview);
    } catch (error) {
        console.error("Error updating review:", error);
        ResponseApi.error(res, "Failed to update review", 500);
    }
};




export const deleteReview = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;

    try {
        if (!id) {
            return ResponseApi.notFound(res, "Review ID is required", 422);
        }

        const review = await prisma.review.findUnique({
            where: { id },
        });

        if (!review) {
            return ResponseApi.notFound(res, "Review not found", 404);
        }

        await prisma.review.delete({
            where: { id },
        });

        ResponseApi.success(res, "Review deleted successfully", null, 204);
    } catch (error) {
        console.error("Error deleting review:", error);
        ResponseApi.error(res, "Failed to delete review", 500);
    }
};