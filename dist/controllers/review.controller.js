var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";
export const getAllReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reviews = yield prisma.review.findMany({
            include: {
                user: true
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        ResponseApi.success(res, "Reviews retrieved successfully", reviews);
    }
    catch (error) {
        console.error("Error retrieving reviews:", error);
        ResponseApi.error(res, "Failed to retrieve reviews", 500);
    }
});
export const getReviewById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "Review ID is required", 422);
        }
        const review = yield prisma.review.findUnique({
            where: { id },
            include: {
                user: true
            },
        });
        if (!review) {
            return ResponseApi.notFound(res, "Review not found", 404);
        }
        ResponseApi.success(res, "Review retrieved successfully", review);
    }
    catch (error) {
        console.error("Error retrieving review:", error);
        ResponseApi.error(res, "Failed to retrieve review", 500);
    }
});
export const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId, rating, comment } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Celui qui laisse la note
    try {
        if (!productId || !rating) {
            return ResponseApi.error(res, "All fields are required", null, 400);
        }
        // Trouver l'auteur du produit
        const product = yield prisma.product.findUnique({
            where: { id: productId },
            select: { userId: true }
        });
        if (!product) {
            return ResponseApi.notFound(res, "Product not found", 404);
        }
        const authorId = product.userId;
        const review = yield prisma.review.create({
            data: {
                authorId,
                userId,
                rating
            },
        });
        ResponseApi.success(res, "Review created successfully", review, 201);
    }
    catch (error) {
        console.error("Error creating review:", error);
        ResponseApi.error(res, "Failed to create review", 500);
    }
});
export const updateReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const { rating } = req.body;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "Review ID is required", 422);
        }
        const review = yield prisma.review.findUnique({
            where: { id },
        });
        if (!review) {
            return ResponseApi.notFound(res, "Review not found", 404);
        }
        const updatedReview = yield prisma.review.update({
            where: { id },
            data: {
                rating
            },
        });
        ResponseApi.success(res, "Review updated successfully", updatedReview);
    }
    catch (error) {
        console.error("Error updating review:", error);
        ResponseApi.error(res, "Failed to update review", 500);
    }
});
export const deleteReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return ResponseApi.notFound(res, "Review ID is required", 422);
        }
        const review = yield prisma.review.findUnique({
            where: { id },
        });
        if (!review) {
            return ResponseApi.notFound(res, "Review not found", 404);
        }
        yield prisma.review.delete({
            where: { id },
        });
        ResponseApi.success(res, "Review deleted successfully", null, 204);
    }
    catch (error) {
        console.error("Error deleting review:", error);
        ResponseApi.error(res, "Failed to delete review", 500);
    }
});
export const getReviewsForUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authorId = req.params.userId;
    try {
        if (!authorId) {
            return ResponseApi.notFound(res, "User ID is required", 422);
        }
        // Récupérer toutes les reviews pour cet utilisateur
        const reviews = yield prisma.review.findMany({
            where: { authorId },
            include: {
                user: true, // Celui qui a noté
                author: true, // Celui qui est noté
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        // Calculer la moyenne des notes
        const average = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;
        ResponseApi.success(res, "Reviews for user retrieved successfully", {
            reviews,
            averageRating: average,
        });
    }
    catch (error) {
        console.error("Error retrieving reviews for user:", error);
        ResponseApi.error(res, "Failed to retrieve reviews for user", 500);
    }
});
