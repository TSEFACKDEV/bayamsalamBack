import express from "express";
import {
  createProduct,
  deleteProduct,
  deleteProductOfSuspendedUser, // Changer ici
  getAllProducts,
  getAllProductsWithoutPagination,
  getPendingProducts,
  getUserPendingProducts,
  getProductById,
  getValidatedProducts,
  recordProductView,
  getProductViewStats,
  reviewProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import checkPermission from "../middlewares/checkPermission.js";
import validate from "../middlewares/validation.js";
import {
  createProductSchema,
  reviewProductSchema,
} from "../validations/product.validation.js";

const router = express.Router();

// Routes pour les produits

router.post(
  "/",
  authenticate,
  checkPermission("PRODUCT_CREATE"),
  validate(createProductSchema),
  createProduct
);
router.put(
  "/:id",
  authenticate,
  checkPermission("PRODUCT_UPDATE"),
  updateProduct
);
router.delete(
  "/:id",
  authenticate,
  checkPermission("PRODUCT_DELETE"),
  deleteProduct
);

//pour valider ou rejeter une annonce [administrateurs]
router.patch(
  "/:id/check",
  authenticate,
  checkPermission("PRODUCT_REVIEW"),
  validate(reviewProductSchema),
  reviewProduct
);
//pour recuperer les annonces en attente [administrateurs]
router.get(
  "/preview",
  authenticate,
  checkPermission("PRODUCT_PREVIEW"),
  getPendingProducts
);
//pour recuperer les propres annonces en attente de l'utilisateur connecté [utilisateurs]
router.get("/my-pending", authenticate, getUserPendingProducts);
//pour recuperer tous les produits [administrateurs]
router.get(
  "/all",
  authenticate,
  checkPermission("PRODUCT_READ"),
  getAllProducts
);
//pour recuperer tous les produits sans pagination[developpeurs]
router.get(
  "/dev",
  authenticate,
  checkPermission("PRODUCT_READ"),
  getAllProductsWithoutPagination
);

//pour recuperer tous les produits avec un status = VALIDATED [utilisateurs]
router.get("/", getValidatedProducts);

// Routes pour les vues d'annonces (utilisateurs connectés uniquement)
router.post("/:productId/view", authenticate, recordProductView);
router.get("/:productId/stats", getProductViewStats);

router.get("/:id", getProductById);

// Route pour supprimer tous les produits d'un utilisateur suspendu
router.post(
  "/delete-of-suspended-user",
  authenticate,
  checkPermission("PRODUCT_DELETE"),
  deleteProductOfSuspendedUser
);

export default router;
