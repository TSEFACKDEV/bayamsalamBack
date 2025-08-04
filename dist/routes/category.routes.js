"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const category_controller_js_1 = require("../controllers/category.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const router = express_1.default.Router();
router.get("/", category_controller_js_1.getAllCategories);
router.get("/:id", category_controller_js_1.getCategoryById);
router.use(auth_middleware_js_1.authenticate);
router.post("/", (0, checkPermission_js_1.default)("CATEGORY_CREATE"), category_controller_js_1.createCategory);
router.put("/:id", (0, checkPermission_js_1.default)("CATEGORY_UPDATE"), category_controller_js_1.updateCategory);
router.delete("/:id", (0, checkPermission_js_1.default)("CATEGORY_DELETE"), category_controller_js_1.deleteCategory);
exports.default = router;
