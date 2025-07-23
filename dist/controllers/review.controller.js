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
                user: true,
                product: true,
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
                user: true,
                product: true,
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
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Assuming user ID is stored in req.user
    try {
        if (!productId || !rating || !comment) {
            return ResponseApi.error(res, "All fields are required", null, 400);
        }
        const review = yield prisma.review.create({
            data: {
                productId,
                userId,
                rating,
                comment,
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
    const { rating, comment } = req.body;
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
                rating,
                comment,
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
