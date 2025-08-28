import express from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getAllProductsWithoutPagination,
  getPendingProducts,
  getProductById,
  getValidatedProducts,
  reviewProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { authenticate} from "../middlewares/auth.middleware.js";
import checkPermission from "../middlewares/checkPermission.js";
import validate from "../middlewares/validation.js";
import { createProductSchema, reviewProductSchema } from "../validations/product.validation.js";

const router = express.Router();

// Routes pour les produits

router.post("/", authenticate, checkPermission("PRODUCT_CREATE"), validate(createProductSchema), createProduct);
router.put("/:id", authenticate, checkPermission("PRODUCT_UPDATE"), updateProduct);
router.delete("/:id", authenticate, checkPermission("PRODUCT_DELETE"), deleteProduct);

//pour valider ou rejeter une annonce [administrateurs]
router.patch('/:id/check', authenticate, checkPermission("PRODUCT_REVIEW"), validate(reviewProductSchema), reviewProduct);
//pour recuperer les annonces en attente [administrateurs]
router.get("/preview", authenticate, checkPermission("PRODUCT_PREVIEW"), getPendingProducts);
//pour recuperer tous les produits [administrateurs]
router.get("/all", authenticate, checkPermission("PRODUCT_READ"), getAllProducts);
//pour recuperer tous les produits sans pagination[developpeurs]
router.get("/dev", authenticate, checkPermission("PRODUCT_READ"), getAllProductsWithoutPagination);

//pour recuperer tous les produits avec un status = VALIDATED [utilisateurs]
router.get("/", getValidatedProducts);
router.get("/:id", getProductById);


export default router;
