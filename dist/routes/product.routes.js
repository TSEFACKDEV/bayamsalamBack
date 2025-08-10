"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const product_controller_js_1 = require("../controllers/product.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const router = express_1.default.Router();
//pour recuperer tous les produits avec un status = VALIDATED [utilisateurs]
router.post("/", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_CREATE"), product_controller_js_1.createProduct);
router.put("/:id", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_UPDATE"), product_controller_js_1.updateProduct);
router.delete("/:id", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_DELETE"), product_controller_js_1.deleteProduct);
//pour valider ou rejeter une annonce [administrateurs]
router.patch('/:id/check', auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_REVIEW"), product_controller_js_1.reviewProduct);
//pour recuperer les annonces en attente [administrateurs]
router.get("/preview", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_PREVIEW"), product_controller_js_1.getPendingProducts);
//pour recuperer tous les produits [administrateurs]
router.get("/all", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_READ"), product_controller_js_1.getAllProducts);
//pour recuperer tous les produits sans pagination[developpeurs]
router.get("/dev", auth_middleware_js_1.authenticate, (0, checkPermission_js_1.default)("PRODUCT_READ"), product_controller_js_1.getAllProductsWithoutPagination);
router.get("/", product_controller_js_1.getValidatedProducts);
router.get("/:id", product_controller_js_1.getProductById);
exports.default = router;
