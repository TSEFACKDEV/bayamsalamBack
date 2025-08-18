"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_js_1 = __importDefault(require("./config/config.js"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const errorHandler_js_1 = require("./middlewares/errorHandler.js");
const index_js_1 = __importDefault(require("./routes/index.js"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const node_path_1 = __importDefault(require("node:path"));
const prisma_client_js_1 = __importDefault(require("./model/prisma.client.js")); // adapte le chemin si besoin
const bcrypt_js_1 = require("./utilities/bcrypt.js"); // adapte le chemin si besoin
const app = (0, express_1.default)();
//Middleware
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)()); // Ajout du middleware cookie-parser
app.use((0, express_fileupload_1.default)({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    abortOnLimit: true,
}));
// Static files
app.use("/public", express_1.default.static(node_path_1.default.join(__dirname, "../public")));
//Routes
console.log("Mounting /api/bayamsalam routes");
app.use("/api/bayamsalam", index_js_1.default);
// Health check
app.get("/api/bayamsalam", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});
//creation des admins
function createSuperAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        const email = "tsefackcalvinklein@gmail.com";
        try {
            const superAdminRole = yield prisma_client_js_1.default.role.findUnique({
                where: { name: "SUPER_ADMIN" },
            });
            if (!superAdminRole) {
                console.error("Le rôle SUPER_ADMIN n'existe pas. Veuillez lancer le seed d'abord.");
                return;
            }
            let user = yield prisma_client_js_1.default.user.findUnique({ where: { email } });
            if (!user) {
                user = yield prisma_client_js_1.default.user.create({
                    data: {
                        firstName: "super admin",
                        lastName: "BuyamSale",
                        email,
                        password: yield (0, bcrypt_js_1.hashPassword)("BuyamSale"),
                        isVerified: true,
                        phone: "B",
                        status: "ACTIVE",
                    },
                });
                console.log("Super admin créé avec succès !");
            }
            else {
                console.log("Le super admin existe déjà.");
            }
            // Assigner le rôle SUPER_ADMIN si ce n'est pas déjà fait
            const alreadyAssigned = yield prisma_client_js_1.default.userRole.findUnique({
                where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
            });
            if (!alreadyAssigned) {
                yield prisma_client_js_1.default.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: superAdminRole.id,
                    },
                });
                console.log("Rôle SUPER_ADMIN assigné au super admin.");
            }
            else {
                console.log("Le super admin a déjà le rôle SUPER_ADMIN.");
            }
        }
        catch (error) {
            console.error("Erreur lors de la création du super admin :", error);
        }
    });
}
// Appeler la fonction au démarrage
createSuperAdmin().catch(console.error);
// Gestion des erreurs
app.use(errorHandler_js_1.errorHandler);
app.listen(config_js_1.default.port, () => {
    console.log(`Server is running on http://${config_js_1.default.host}:${config_js_1.default.port}`);
});
