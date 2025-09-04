"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const auth_validation_js_1 = require("../validations/auth.validation.js");
const validation_js_1 = __importDefault(require("../middlewares/validation.js"));
const passport_config_js_1 = __importDefault(require("../config/passport.config.js")); // Importer passport
const router = express_1.default.Router();
// Routes existantes
router.post("/register", (0, validation_js_1.default)(auth_validation_js_1.registerSchema), auth_controller_js_1.register);
router.post("/verify-otp", (0, validation_js_1.default)(auth_validation_js_1.verifyOTPSchema), auth_controller_js_1.verifyOTP);
router.post("/login", (0, validation_js_1.default)(auth_validation_js_1.loginSchema), auth_controller_js_1.login);
router.post("/logout", (0, validation_js_1.default)(auth_validation_js_1.logoutSchema), auth_controller_js_1.logout);
router.post("/refresh-token", (0, validation_js_1.default)(auth_validation_js_1.refreshTokenSchema), auth_controller_js_1.refreshToken);
router.post("/forgot-password", (0, validation_js_1.default)(auth_validation_js_1.forgotPasswordSchema), auth_controller_js_1.forgotPassword);
router.post("/reset-password", (0, validation_js_1.default)(auth_validation_js_1.resetPasswordSchema), auth_controller_js_1.resetPassword);
// Routes pour l'authentification Google
router.get("/google", passport_config_js_1.default.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport_config_js_1.default.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=google_auth_failed`
}), auth_controller_js_1.googleCallback);
router.use(auth_middleware_js_1.authenticate);
router.get("/me", auth_controller_js_1.getUserProfile);
exports.default = router;
