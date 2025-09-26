"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_js_1 = require("../controllers/user.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const checkPermission_js_1 = __importDefault(require("../middlewares/checkPermission.js"));
const router = express_1.default.Router();
// 🆕 Route publique pour les vendeurs (AVANT authenticate)
router.get("/public-sellers", user_controller_js_1.getAllUsers);
router.use(auth_middleware_js_1.authenticate);
router.post("/", (0, checkPermission_js_1.default)("USER_CREATE"), user_controller_js_1.createUser);
router.get("/", (0, checkPermission_js_1.default)("USER_GET_ALL"), user_controller_js_1.getAllUsers);
router.get("/:id", (0, checkPermission_js_1.default)("USER_GET_BY_ID"), user_controller_js_1.getUserById);
router.put("/:id", (0, checkPermission_js_1.default)("USER_UPDATE"), user_controller_js_1.updateUser);
// route pour signaler un utilisateur
router.post("/report/:id", (0, checkPermission_js_1.default)("USER_REPORT"), user_controller_js_1.reportUser);
// pour recuperer tous les user signalés
exports.default = router;
