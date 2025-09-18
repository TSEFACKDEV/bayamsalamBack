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
const rateLimiter_js_1 = require("../middlewares/rateLimiter.js");
const router = express_1.default.Router();
// Routes existantes
router.post('/register', rateLimiter_js_1.authRateLimiter, (0, validation_js_1.default)(auth_validation_js_1.registerSchema), auth_controller_js_1.register); // 🚦 Rate limiting
router.post('/verify-otp', rateLimiter_js_1.authRateLimiter, (0, validation_js_1.default)(auth_validation_js_1.verifyOTPSchema), auth_controller_js_1.verifyOTP); // 🚦 Rate limiting
router.post('/login', rateLimiter_js_1.authRateLimiter, (0, validation_js_1.default)(auth_validation_js_1.loginSchema), auth_controller_js_1.login); // 🚦 Rate limiting
router.post('/logout', (0, validation_js_1.default)(auth_validation_js_1.logoutSchema), auth_controller_js_1.logout);
router.post('/refresh-token', (0, validation_js_1.default)(auth_validation_js_1.refreshTokenSchema), auth_controller_js_1.refreshToken);
router.post('/forgot-password', rateLimiter_js_1.authRateLimiter, (0, validation_js_1.default)(auth_validation_js_1.forgotPasswordSchema), auth_controller_js_1.forgotPassword); // 🚦 Rate limiting
router.post('/reset-password', rateLimiter_js_1.authRateLimiter, (0, validation_js_1.default)(auth_validation_js_1.resetPasswordSchema), auth_controller_js_1.resetPassword); // 🚦 Rate limiting
// Routes pour l'authentification Google
router.get('/google', 
// Nettoyer la session avant l'authentification pour éviter les conflits
(req, res, next) => {
    // Détruire la session existante pour éviter les conflits
    if (req.session) {
        req.session.destroy((err) => {
            if (err)
                console.error('Erreur lors de la destruction de session:', err);
        });
    }
    next();
}, passport_config_js_1.default.authenticate('google', {
    scope: ['profile', 'email'],
    // Forcer une nouvelle authentification pour éviter les conflits
    prompt: 'select_account',
}));
router.get('/google/callback', (req, res, next) => {
    passport_config_js_1.default.authenticate('google', {
        session: true, // Utiliser les sessions maintenant
        failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=google_auth_failed`,
    })(req, res, (err) => {
        if (err) {
            console.error('Erreur callback Google:', err);
            return res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=auth_failed`);
        }
        next();
    });
}, auth_controller_js_1.googleCallback);
router.use(auth_middleware_js_1.authenticate);
router.get('/me', auth_controller_js_1.getUserProfile);
exports.default = router;
