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
const errorHandler_js_1 = require("./middlewares/errorHandler.js");
const index_js_1 = __importDefault(require("./routes/index.js"));
const node_path_1 = __importDefault(require("node:path"));
const http_1 = __importDefault(require("http"));
const socket_js_1 = require("./utilities/socket.js");
const passport_1 = __importDefault(require("passport"));
require("./config/passport.config.js");
const app = (0, express_1.default)();
//Middleware
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ], // Frontend URLs autorisées
    credentials: true, // Permet l'envoi des cookies/credentials
    optionsSuccessStatus: 200, // Support legacy browsers
}));
// Configuration de session sécurisée
app.use((0, express_session_1.default)({
    secret: config_js_1.default.sessionSecret || "bayamsalam-session-secret-2024",
    resave: false,
    saveUninitialized: false,
    name: "bayamsalam.sid", // Nom de session unique
    cookie: {
        secure: config_js_1.default.nodeEnv === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
        sameSite: config_js_1.default.nodeEnv === "production" ? "none" : "lax",
    },
    // Génération d'ID de session unique pour éviter les conflits
    genid: () => {
        return require("crypto").randomBytes(16).toString("hex");
    },
}));
app.use((0, cookie_parser_1.default)()); // ✅ Middleware pour parser les cookies
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, express_fileupload_1.default)({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    abortOnLimit: true,
}));
// Static files
app.use("/public", express_1.default.static(node_path_1.default.join(__dirname, "../public")));
//Routes
app.use(passport_1.default.initialize());
app.use(passport_1.default.session()); // Ajouter le support des sessions pour Passport
app.use("/api/bayamsalam", index_js_1.default);
// Health check
app.get("/api/bayamsalam", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});
// Gestion des erreurs
app.use(errorHandler_js_1.errorHandler);
// Remplace app.listen par http server + initSockets
const server = http_1.default.createServer(app);
(0, socket_js_1.initSockets)(server);
server.listen(config_js_1.default.port, () => {
    console.log(`Server is running on http://${config_js_1.default.host}:${config_js_1.default.port}`);
});
