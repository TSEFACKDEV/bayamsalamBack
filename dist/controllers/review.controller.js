"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsForUser = exports.deleteReview = exports.updateReview = exports.createReview = exports.getReviewById = exports.getAllReviews = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const getAllReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reviews = yield prisma_client_js_1.default.review.findMany({
            include: {
                user: true
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        response_js_1.default.success(res, "Reviews retrieved successfully", reviews);
    }
    catch (error) {
        console.error("Error retrieving reviews:", error);
        response_js_1.default.error(res, "Failed to retrieve reviews", 500);
    }
});
exports.getAllReviews = getAllReviews;
const getReviewById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "Review ID is required", 422);
        }
        const review = yield prisma_client_js_1.default.review.findUnique({
            where: { id },
            include: {
                user: true
            },
        });
        if (!review) {
            return response_js_1.default.notFound(res, "Review not found", 404);
        }
        response_js_1.default.success(res, "Review retrieved successfully", review);
    }
    catch (error) {
        console.error("Error retrieving review:", error);
        response_js_1.default.error(res, "Failed to retrieve review", 500);
    }
});
exports.getReviewById = getReviewById;
const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId, rating, comment } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Celui qui laisse la note
    try {
        if (!productId || !rating) {
            return response_js_1.default.error(res, "All fields are required", null, 400);
        }
        // Trouver l'auteur du produit
        const product = yield prisma_client_js_1.default.product.findUnique({
            where: { id: productId },
            select: { userId: true }
        });
        if (!product) {
            return response_js_1.default.notFound(res, "Product not found", 404);
        }
        const authorId = product.userId;
        const review = yield prisma_client_js_1.default.review.create({
            data: {
                authorId,
                userId,
                rating
            },
        });
        response_js_1.default.success(res, "Review created successfully", review, 201);
    }
    catch (error) {
        console.error("Error creating review:", error);
        response_js_1.default.error(res, "Failed to create review", 500);
    }
});
exports.createReview = createReview;
const updateReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const { rating } = req.body;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "Review ID is required", 422);
        }
        const review = yield prisma_client_js_1.default.review.findUnique({
            where: { id },
        });
        if (!review) {
            return response_js_1.default.notFound(res, "Review not found", 404);
        }
        const updatedReview = yield prisma_client_js_1.default.review.update({
            where: { id },
            data: {
                rating
            },
        });
        response_js_1.default.success(res, "Review updated successfully", updatedReview);
    }
    catch (error) {
        console.error("Error updating review:", error);
        response_js_1.default.error(res, "Failed to update review", 500);
    }
});
exports.updateReview = updateReview;
const deleteReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "Review ID is required", 422);
        }
        const review = yield prisma_client_js_1.default.review.findUnique({
            where: { id },
        });
        if (!review) {
            return response_js_1.default.notFound(res, "Review not found", 404);
        }
        yield prisma_client_js_1.default.review.delete({
            where: { id },
        });
        response_js_1.default.success(res, "Review deleted successfully", null, 204);
    }
    catch (error) {
        console.error("Error deleting review:", error);
        response_js_1.default.error(res, "Failed to delete review", 500);
    }
});
exports.deleteReview = deleteReview;
const getReviewsForUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authorId = req.params.userId;
    try {
        if (!authorId) {
            return response_js_1.default.notFound(res, "User ID is required", 422);
        }
        // Récupérer toutes les reviews pour cet utilisateur
        const reviews = yield prisma_client_js_1.default.review.findMany({
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
        response_js_1.default.success(res, "Reviews for user retrieved successfully", {
            reviews,
            averageRating: average,
        });
    }
    catch (error) {
        console.error("Error retrieving reviews for user:", error);
        response_js_1.default.error(res, "Failed to retrieve reviews for user", 500);
    }
});
exports.getReviewsForUser = getReviewsForUser;
