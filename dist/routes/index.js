"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const category_routes_js_1 = __importDefault(require("./category.routes.js"));
const city_routes_js_1 = __importDefault(require("./city.routes.js"));
const auth_routes_js_1 = __importDefault(require("./auth.routes.js"));
const user_routes_js_1 = __importDefault(require("./user.routes.js"));
const product_routes_js_1 = __importDefault(require("./product.routes.js"));
const review_routes_js_1 = __importDefault(require("./review.routes.js"));
const favorite_routes_js_1 = __importDefault(require("./favorite.routes.js"));
const contact_routes_js_1 = __importDefault(require("./contact.routes.js"));
const role_routes_js_1 = __importDefault(require("./role.routes.js"));
const permission_routes_js_1 = __importDefault(require("./permission.routes.js"));
const forfait_routes_js_1 = __importDefault(require("./forfait.routes.js"));
const notification_routes_js_1 = __importDefault(require("./notification.routes.js"));
const report_routes_js_1 = __importDefault(require("./report.routes.js"));
const cache_routes_js_1 = __importDefault(require("./cache.routes.js")); // 🚀 Ajout des routes cache
const security_routes_js_1 = __importDefault(require("./security.routes.js")); // 🔐 Ajout du monitoring de sécurité
const csrf_routes_js_1 = __importDefault(require("./csrf.routes.js")); // 🛡️ Ajout des routes CSRF
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.use("/category", category_routes_js_1.default);
router.use("/city", city_routes_js_1.default);
router.use("/auth", auth_routes_js_1.default);
router.use("/user", user_routes_js_1.default);
router.use("/product", product_routes_js_1.default);
router.use("/review", review_routes_js_1.default);
router.use("/favorite", favorite_routes_js_1.default);
router.use("/contact", contact_routes_js_1.default);
router.use("/role", role_routes_js_1.default);
router.use("/permission", permission_routes_js_1.default);
router.use("/forfait", forfait_routes_js_1.default);
router.use("/notification", notification_routes_js_1.default);
router.use("/reports", report_routes_js_1.default);
router.use("/cache", cache_routes_js_1.default); // 🚀 Endpoint de monitoring cache
router.use("/security", security_routes_js_1.default); // 🔐 Endpoint de monitoring sécurité
router.use("/csrf", csrf_routes_js_1.default); // 🛡️ Endpoints de gestion CSRF
exports.default = router;
