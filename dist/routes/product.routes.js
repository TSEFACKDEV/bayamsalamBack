"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const product_controller_js_1 = require("../controllers/product.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const validation_js_1 = __importDefault(require("../middlewares/validation.js"));
const product_validation_js_1 = require("../validations/product.validation.js");
const strictValidator_js_1 = require("../middlewares/strictValidator.js");
const rateLimiter_js_1 = require("../middlewares/rateLimiter.js");
const router = express_1.default.Router();
// Routes pour les produits
router.post("/", rateLimiter_js_1.uploadRateLimiter, // 🚦 Rate limiting spécifique upload
auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_CREATE"), strictValidator_js_1.createValidator, // 🔒 Validation stricte création
(0, validation_js_1.default)(product_validation_js_1.createProductSchema), product_controller_js_1.createProduct);
router.put("/:id", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_UPDATE"), strictValidator_js_1.updateValidator, // 🔒 Validation stricte modification
product_controller_js_1.updateProduct);
router.delete("/:id", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_DELETE"), product_controller_js_1.deleteProduct);
//pour valider ou rejeter une annonce [administrateurs]
router.patch("/:id/check", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_REVIEW"), (0, validation_js_1.default)(product_validation_js_1.reviewProductSchema), product_controller_js_1.reviewProduct);
//pour recuperer les annonces en attente [administrateurs]
router.get("/preview", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_PREVIEW"), product_controller_js_1.getPendingProducts);
//pour recuperer les propres annonces en attente de l'utilisateur connecté [utilisateurs]
router.get("/my-pending", auth_middleware_js_1.authenticate, product_controller_js_1.getUserPendingProducts);
//pour recuperer tous les produits [administrateurs]
router.get("/all", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_READ"), strictValidator_js_1.readValidator, // 🔒 Validation stricte lecture
product_controller_js_1.getAllProducts);
//pour recuperer tous les produits sans pagination[developpeurs]
router.get("/dev", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_READ"), product_controller_js_1.getAllProductsWithoutPagination);
//pour recuperer tous les produits avec un status = VALIDATED [utilisateurs]
router.get("/", strictValidator_js_1.readValidator, product_controller_js_1.getValidatedProducts); // 🔒 Validation stricte lecture publique
// pour recuperer tous les produit de la page home [utilisateurs]
router.get("/home", strictValidator_js_1.readValidator, product_controller_js_1.getHomePageProduct); // 🔒 Validation stricte home
// Routes pour les vues d'annonces (utilisateurs connectés uniquement)
router.post("/:productId/view", auth_middleware_js_1.authenticate, product_controller_js_1.recordProductView);
router.get("/:productId/stats", product_controller_js_1.getProductViewStats);
router.get("/:id", product_controller_js_1.getProductById);
// Route pour supprimer tous les produits d'un utilisateur suspendu
router.post("/delete-of-suspended-user", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_DELETE"), product_controller_js_1.deleteProductOfSuspendedUser);
// Route pour récupérer les produits validés d'un vendeur spécifique
router.get("/seller/:sellerId", strictValidator_js_1.readValidator, // 🔒 Validation stricte lecture
product_controller_js_1.getSellerProducts);
// Route pour récupérer les produits validés d'un utilisateur (profil public)
router.get("/user/:userId", strictValidator_js_1.readValidator, // 🔒 Validation stricte lecture
product_controller_js_1.getUserProducts);
// Route pour récupérer les produits d'une catégorie spécifique
router.get("/category/:categoryId/products", strictValidator_js_1.readValidator, // 🔒 Validation stricte lecture
product_controller_js_1.getCategoryProducts);
exports.default = router;
