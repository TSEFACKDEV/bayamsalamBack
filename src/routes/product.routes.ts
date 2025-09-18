import express from 'express';
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
  getHomePageProduct,
} from '../controllers/product.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import checkPermission from '../middlewares/checkPermission.js';
import validate from '../middlewares/validation.js';
import {
  createProductSchema,
  reviewProductSchema,
} from '../validations/product.validation.js';
import {
  readValidator,
  createValidator,
  updateValidator,
} from '../middlewares/strictValidator.js';
import {
  authRateLimiter,
  uploadRateLimiter,
} from '../middlewares/rateLimiter.js';

const router = express.Router();

// Routes pour les produits

router.post(
  '/',
  uploadRateLimiter, // 🚦 Rate limiting spécifique upload
  authenticate,
  checkPermission('PRODUCT_CREATE'),
  createValidator, // 🔒 Validation stricte création
  validate(createProductSchema),
  createProduct
);
router.put(
  '/:id',
  authenticate,
  checkPermission('PRODUCT_UPDATE'),
  updateValidator, // 🔒 Validation stricte modification
  updateProduct
);
router.delete(
  '/:id',
  authenticate,
  checkPermission('PRODUCT_DELETE'),
  deleteProduct
);

//pour valider ou rejeter une annonce [administrateurs]
router.patch(
  '/:id/check',
  authenticate,
  checkPermission('PRODUCT_REVIEW'),
  validate(reviewProductSchema),
  reviewProduct
);
//pour recuperer les annonces en attente [administrateurs]
router.get(
  '/preview',
  authenticate,
  checkPermission('PRODUCT_PREVIEW'),
  getPendingProducts
);
//pour recuperer les propres annonces en attente de l'utilisateur connecté [utilisateurs]
router.get('/my-pending', authenticate, getUserPendingProducts);
//pour recuperer tous les produits [administrateurs]
router.get(
  '/all',
  authenticate,
  checkPermission('PRODUCT_READ'),
  readValidator, // 🔒 Validation stricte lecture
  getAllProducts
);
//pour recuperer tous les produits sans pagination[developpeurs]
router.get(
  '/dev',
  authenticate,
  checkPermission('PRODUCT_READ'),
  getAllProductsWithoutPagination
);

//pour recuperer tous les produits avec un status = VALIDATED [utilisateurs]
router.get('/', readValidator, getValidatedProducts); // 🔒 Validation stricte lecture publique

// pour recuperer tous les produit de la page home [utilisateurs]
router.get('/home', readValidator, getHomePageProduct); // 🔒 Validation stricte home

// Routes pour les vues d'annonces (utilisateurs connectés uniquement)
router.post('/:productId/view', authenticate, recordProductView);
router.get('/:productId/stats', getProductViewStats);

router.get('/:id', getProductById);

// Route pour supprimer tous les produits d'un utilisateur suspendu
router.post(
  '/delete-of-suspended-user',
  authenticate,
  checkPermission('PRODUCT_DELETE'),
  deleteProductOfSuspendedUser
);

export default router;
