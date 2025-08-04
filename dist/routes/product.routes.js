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
router.patch('/:id/check', (0, checkPermission_js_1.default)("PRODUCT_REVIEW"), product_controller_js_1.reviewProduct);
router.get("/preview", (0, checkPermission_js_1.default)("PRODUCT_PREVIEW"), product_controller_js_1.getPendingProducts);
router.get("/", product_controller_js_1.getAllProducts);
router.get("/:id", product_controller_js_1.getProductById);
router.use(auth_middleware_js_1.authenticate);
router.post("/", (0, checkPermission_js_1.default)("PRODUCT_CREATE"), product_controller_js_1.createProduct);
router.put("/:id", (0, checkPermission_js_1.default)("PRODUCT_UPDATE"), product_controller_js_1.updateProduct);
router.delete("/:id", (0, checkPermission_js_1.default)("PRODUCT_DELETE"), product_controller_js_1.deleteProduct);
exports.default = router;
