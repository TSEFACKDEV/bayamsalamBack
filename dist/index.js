"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_js_1 = __importDefault(require("./config/config.js"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const express_session_1 = __importDefault(require("express-session"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = __importDefault(require("http"));
const passport_1 = __importDefault(require("passport"));
const node_path_1 = __importDefault(require("node:path"));
const errorHandler_js_1 = require("./middlewares/errorHandler.js");
const contentTypeValidator_js_1 = require("./middlewares/contentTypeValidator.js");
const rateLimiter_js_1 = require("./middlewares/rateLimiter.js");
const crypto_utils_js_1 = require("./utilities/crypto.utils.js");
const socket_js_1 = require("./utilities/socket.js");
const index_js_1 = __importDefault(require("./routes/index.js"));
const forfaitScheduler_service_js_1 = require("./services/forfaitScheduler.service.js");
require("./config/passport.config.js");
crypto_utils_js_1.SecurityUtils.runSecurityAudit();
const app = (0, express_1.default)();
// Security headers with Helmet
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: config_js_1.default.nodeEnv === "production" ? [] : null,
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
    frameguard: { action: "deny" },
    noSniff: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: config_js_1.default.nodeEnv === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        }
        : false,
    hidePoweredBy: true,
    xssFilter: true,
}));
//Middleware
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
}));
// Session configuration
app.use((0, express_session_1.default)({
    secret: config_js_1.default.sessionSecret || "buyandsale-session-secret-2024",
    resave: false,
    saveUninitialized: false,
    name: "buyandsale.sid",
    cookie: {
        secure: config_js_1.default.nodeEnv === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: config_js_1.default.nodeEnv === "production" ? "none" : "lax",
    },
    genid: () => {
        return require("crypto").randomBytes(16).toString("hex");
    },
}));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use((0, contentTypeValidator_js_1.validateContentType)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, express_fileupload_1.default)({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
}));
app.use("/public", express_1.default.static(node_path_1.default.join(__dirname, "../public")));
app.use("/api/buyandsale", rateLimiter_js_1.generalRateLimiter);
// Routes
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use("/api/buyandsale", index_js_1.default);
// Health check
app.get("/api/buyandsale", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});
app.use(errorHandler_js_1.errorHandler);
const server = http_1.default.createServer(app);
(0, socket_js_1.initSockets)(server);
server.listen(config_js_1.default.port, () => {
    console.log(`Server is running on http://${config_js_1.default.host}:${config_js_1.default.port}`);
    // 🚀 Démarrage du service de surveillance des forfaits
    forfaitScheduler_service_js_1.ForfaitSchedulerService.start();
});
