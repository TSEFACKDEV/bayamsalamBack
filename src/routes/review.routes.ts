import express from "express";
import {
  createReview,
  deleteReview,
  getAllReviews,
  getReviewById,
  updateReview,
  getReviewsForUser,
  getReviewsByUser,
} from "../controllers/review.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Routes publiques
router.get("/", getAllReviews);
router.get("/seller/:userId", getReviewsForUser);

// Routes protégées (authentification requise)
router.use(authenticate);
router.get("/my-reviews", getReviewsByUser);
router.post("/", createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);

// Route publique avec paramètre (doit être après les routes spécifiques)
router.get("/:id", getReviewById);

export default router;
