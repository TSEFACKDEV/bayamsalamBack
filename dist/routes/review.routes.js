import express from "express";
import { createReview, deleteReview, getAllReviews, getReviewById, updateReview, } from "../controllers/review.controller.js";
const router = express.Router();
router.post("/", createReview);
router.get("/", getAllReviews);
router.get("/:id", getReviewById);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);
export default router;
