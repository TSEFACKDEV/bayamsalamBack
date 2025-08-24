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
exports.reviewProduct = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getPendingProducts = exports.getValidatedProducts = exports.getAllProductsWithoutPagination = exports.getAllProducts = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const utils_js_1 = __importDefault(require("../helper/utils.js"));
const mailer_js_1 = require("../utilities/mailer.js");
const reviewProductTemplate_js_1 = require("../templates/reviewProductTemplate.js");
const notification_service_js_1 = require("../services/notification.service.js");
// pour recuperer tous les produits avec pagination  [ce ci sera pour les administrateurs]
// ✅ UPDATED: Ajout du support du filtrage par status
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status; // ✅ Récupérer le paramètre status
    try {
        const where = {};
        if (search) {
            // MODIFIÉ: Supprimé mode "insensitive" car non supporté par MySQL - utilise contains simple
            where.name = { contains: search };
        }
        // ✅ Ajouter le filtre par status si fourni
        if (status && ["PENDING", "VALIDATED", "REJECTED"].includes(status)) {
            where.status = status;
        }
        const products = yield prisma_client_js_1.default.product.findMany({
            skip: offset,
            take: limit,
            orderBy: { createdAt: "desc" },
            where,
            include: {
                category: true,
                city: true,
                user: true, // On inclut l'utilisateur
            },
        });
        // Pour chaque produit, calculer la somme des points reçus par le user qui a posté le produit
        const productsWithUserPoints = yield Promise.all(products.map((product) => __awaiter(void 0, void 0, void 0, function* () {
            // On suppose que la table review a un champ userId qui correspond au propriétaire du produit
            const userReviews = yield prisma_client_js_1.default.review.findMany({
                where: { userId: product.userId },
            });
            const totalPoints = userReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
            const averagePoints = userReviews.length > 0 ? totalPoints / userReviews.length : null;
            return Object.assign(Object.assign({}, product), { 
                // 🔧 Conversion sécurisée des images en URLs complètes avec vérification TypeScript
                images: Array.isArray(product.images)
                    ? product.images.map((imagePath) => utils_js_1.default.resolveFileUrl(req, imagePath))
                    : [], userTotalPoints: totalPoints, userAveragePoints: averagePoints });
        })));
        const total = yield prisma_client_js_1.default.product.count({ where });
        response_js_1.default.success(res, "Products retrieved successfully!", {
            products: productsWithUserPoints,
            links: {
                perpage: limit,
                prevPage: page > 1 ? page - 1 : null,
                currentPage: page,
                nextPage: offset + limit < total ? page + 1 : null,
                totalPage: Math.ceil(total / limit),
                total: total,
            },
        });
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to get all products", error.message);
    }
});
exports.getAllProducts = getAllProducts;
//pour recuperer tous les produits sans pagination [pour le developpeur]
const getAllProductsWithoutPagination = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma_client_js_1.default.product.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                category: true,
                city: true,
                user: true,
            },
        });
        response_js_1.default.success(res, "Products retrieved successfully!", {
            products,
        });
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to get all products", error.message);
    }
});
exports.getAllProductsWithoutPagination = getAllProductsWithoutPagination;
//pour recuperer tous les produits avec un status = VALIDATED, pagination et recherche [pour les utilisateurs]
const getValidatedProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const categoryId = req.query.categoryId; // ✅ Ajout du filtre catégorie
    const cityId = req.query.cityId; // ✅ Ajout du filtre ville
    try {
        const where = { status: "VALIDATED" };
        if (search) {
            // MODIFIÉ: Supprimé mode "insensitive" car non supporté par MySQL - utilise contains simple
            where.name = { contains: search };
        }
        // ✅ Ajout des filtres par catégorie et ville
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (cityId) {
            where.cityId = cityId;
        }
        const products = yield prisma_client_js_1.default.product.findMany({
            skip: offset,
            take: limit,
            orderBy: { createdAt: "desc" },
            where,
            include: {
                category: true,
                city: true,
                user: true,
                productForfaits: {
                    where: { isActive: true, expiresAt: { gt: new Date() } },
                    include: { forfait: true },
                },
            },
        });
        const total = yield prisma_client_js_1.default.product.count({ where });
        // 🔧 Conversion sécurisée des images en URLs complètes avec vérification TypeScript pour les produits validés
        const productsWithImageUrls = products.map((product) => (Object.assign(Object.assign({}, product), { images: Array.isArray(product.images)
                ? product.images.map((imagePath) => utils_js_1.default.resolveFileUrl(req, imagePath))
                : [] })));
        response_js_1.default.success(res, "Validated products retrieved successfully!", {
            products: productsWithImageUrls,
            links: {
                perpage: limit,
                prevPage: page > 1 ? page - 1 : null,
                currentPage: page,
                nextPage: offset + limit < total ? page + 1 : null,
                totalPage: Math.ceil(total / limit),
                total: total,
            },
        });
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to get validated products", error.message);
    }
});
exports.getValidatedProducts = getValidatedProducts;
// pour voire tous les produits nouvellement creer avec un statut PENDING [administrateurs]
const getPendingProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pendingProducts = yield prisma_client_js_1.default.product.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "desc" },
        });
        response_js_1.default.success(res, "Pending products retrieved successfully", pendingProducts);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to retrieve pending products", error.message);
    }
});
exports.getPendingProducts = getPendingProducts;
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    ``;
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "id is not found", 422);
        }
        const result = yield prisma_client_js_1.default.product.findFirst({
            where: {
                id,
            },
            include: {
                category: true,
                city: true,
                user: true, // Inclure les données de l'utilisateur
            },
        });
        if (!result) {
            return response_js_1.default.notFound(res, "Product not found", 404);
        }
        // 🔧 Conversion sécurisée des images en URLs complètes avec vérification TypeScript
        const productWithImageUrls = Object.assign(Object.assign({}, result), { images: Array.isArray(result.images)
                ? result.images.map((imagePath) => utils_js_1.default.resolveFileUrl(req, imagePath))
                : [] });
        response_js_1.default.success(res, "Product retrieved successfully", productWithImageUrls);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to get product by ID", error.message);
    }
});
exports.getProductById = getProductById;
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, price, quantity, description, categoryId, cityId, etat, quartier, telephone, forfaitType, } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Validation basique
        if (!name ||
            !price ||
            !quantity ||
            !description ||
            !categoryId ||
            !cityId ||
            !etat) {
            return response_js_1.default.error(res, "Tous les champs sont requis", null, 400);
        }
        // Gestion des images (upload)
        if (!req.files || !req.files.images) {
            return response_js_1.default.error(res, "Au moins une image est requise", null, 400);
        }
        let images = req.files.images;
        if (!Array.isArray(images))
            images = [images];
        if (images.length < 1 || images.length > 5) {
            return response_js_1.default.error(res, "Un produit doit avoir entre 1 et 5 images", null, 400);
        }
        // Sauvegarde des images et récupération des chemins
        const savedImages = [];
        for (const img of images) {
            const savedPath = yield utils_js_1.default.saveFile(img, "products");
            savedImages.push(savedPath);
        }
        // Création du produit
        const product = yield prisma_client_js_1.default.product.create({
            data: {
                name,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                description,
                images: savedImages,
                categoryId,
                userId,
                cityId,
                status: "PENDING", // Statut par défaut
                etat,
                quartier,
                telephone,
            },
        });
        // 🔧 Conversion sécurisée des chemins relatifs en URLs complètes avec vérification TypeScript pour la réponse
        const productResponse = Object.assign(Object.assign({}, product), { images: Array.isArray(product.images)
                ? product.images.map((imagePath) => utils_js_1.default.resolveFileUrl(req, imagePath))
                : [] });
        response_js_1.default.success(res, "Produit créé avec succès", productResponse, 201);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Erreur lors de la création du produit", error.message);
    }
});
exports.createProduct = createProduct;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "id is not found", 422);
        }
        const existingProduct = yield prisma_client_js_1.default.product.findFirst({ where: { id } });
        if (!existingProduct) {
            return response_js_1.default.notFound(res, "Product not found", 404);
        }
        const { name, price, quantity, description, categoryId, userId, cityId } = req.body;
        // Gestion des images (upload)
        let images = existingProduct.images;
        if (req.files && req.files.images) {
            let newImages = req.files.images;
            if (!Array.isArray(newImages))
                newImages = [newImages];
            // Supprimer les anciennes images si besoin
            for (const oldImg of images) {
                yield utils_js_1.default.deleteFile(oldImg);
            }
            // Sauvegarder les nouvelles images
            images = [];
            for (const img of newImages) {
                const savedPath = yield utils_js_1.default.saveFile(img, "products");
                images.push(savedPath);
            }
        }
        const updatedProduct = yield prisma_client_js_1.default.product.update({
            where: { id },
            data: {
                name: name !== null && name !== void 0 ? name : existingProduct.name,
                price: price ? parseFloat(price) : existingProduct.price,
                quantity: quantity ? parseInt(quantity) : existingProduct.quantity,
                description: description !== null && description !== void 0 ? description : existingProduct.description,
                images,
                categoryId: categoryId !== null && categoryId !== void 0 ? categoryId : existingProduct.categoryId,
                userId: userId !== null && userId !== void 0 ? userId : existingProduct.userId,
                cityId: cityId !== null && cityId !== void 0 ? cityId : existingProduct.cityId,
            },
        });
        // 🔧 Conversion sécurisée des images en URLs complètes avec vérification TypeScript pour la réponse
        const productWithImageUrls = Object.assign(Object.assign({}, updatedProduct), { images: Array.isArray(updatedProduct.images)
                ? updatedProduct.images.map((imagePath) => utils_js_1.default.resolveFileUrl(req, imagePath))
                : [] });
        response_js_1.default.success(res, "Produit mis à jour avec succès", productWithImageUrls);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Erreur lors de la mise à jour du produit", error.message);
    }
});
exports.updateProduct = updateProduct;
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id) {
            return response_js_1.default.notFound(res, "id is not found", 422);
        }
        const product = yield prisma_client_js_1.default.product.findUnique({ where: { id } });
        if (!product) {
            return response_js_1.default.notFound(res, "Product not found", 404);
        }
        // Supprimer les images associées
        if (product.images && Array.isArray(product.images)) {
            for (const img of product.images) {
                if (typeof img === "string") {
                    yield utils_js_1.default.deleteFile(img);
                }
            }
        }
        // Grâce à onDelete: Cascade dans le schéma, les favoris et forfaits
        // seront automatiquement supprimés
        const result = yield prisma_client_js_1.default.product.delete({
            where: { id },
        });
        response_js_1.default.success(res, "Product deleted successfully", result);
    }
    catch (error) {
        console.log("====================================");
        console.log(error);
        console.log("====================================");
        response_js_1.default.error(res, "Failed to delete product", error.message);
    }
});
exports.deleteProduct = deleteProduct;
const reviewProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { action } = req.body;
    try {
        // ✅ 1. Validation et récupération des données en parallèle
        const [product] = yield Promise.all([
            prisma_client_js_1.default.product.findUnique({
                where: { id },
                include: { user: true },
            }),
            // On peut ajouter d'autres vérifications en parallèle ici si besoin
        ]);
        if (!product) {
            return response_js_1.default.notFound(res, "Product not found", 404);
        }
        // ✅ 2. Préparation des données (synchrone - très rapide)
        let newStatus = null;
        let subject = "";
        let message = "";
        if (action === "validate") {
            newStatus = "VALIDATED";
            subject = "Votre produit a été validé";
            message =
                "Félicitations ! Votre produit a été validé et est désormais visible sur la plateforme.";
        }
        else if (action === "reject") {
            newStatus = "REJECTED";
            subject = "Votre produit a été rejeté";
            message =
                "Nous sommes désolés, votre produit a été rejeté. Veuillez vérifier les informations et réessayer.";
        }
        else {
            return response_js_1.default.error(res, "Invalid action", null, 400);
        }
        // ✅ 3. Mise à jour du produit (opération critique - doit être synchrone)
        yield prisma_client_js_1.default.product.update({
            where: { id },
            data: { status: newStatus },
        });
        // ✅ 4. RÉPONSE IMMÉDIATE au client (performance critique)
        const response = response_js_1.default.success(res, `Product ${newStatus === "VALIDATED" ? "validated" : "rejected"} successfully`, null);
        // ✅ 5. Tâches d'arrière-plan APRÈS la réponse (non-bloquantes)
        // Utilisation de setImmediate/process.nextTick pour éviter de bloquer la réponse
        setImmediate(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            try {
                const backgroundTasks = [];
                // Création notification (en parallèle)
                if ((_a = product.user) === null || _a === void 0 ? void 0 : _a.id) {
                    const notifTitle = newStatus === "VALIDATED" ? "Produit validé" : "Produit rejeté";
                    const notifMessage = newStatus === "VALIDATED"
                        ? `Votre produit "${product.name}" a été validé.`
                        : `Votre produit "${product.name}" a été rejeté.`;
                    backgroundTasks.push((0, notification_service_js_1.createNotification)(product.user.id, notifTitle, notifMessage, {
                        type: "PRODUCT",
                        link: `/product/${id}`,
                    }));
                }
                // Envoi email (en parallèle)
                if ((_b = product.user) === null || _b === void 0 ? void 0 : _b.email) {
                    const html = (0, reviewProductTemplate_js_1.reviewProductTemplate)({
                        userName: product.user.firstName || "Utilisateur",
                        productName: product.name,
                        status: newStatus,
                        message,
                    });
                    backgroundTasks.push((0, mailer_js_1.sendEmail)(product.user.email, subject, message, html));
                }
                // ✅ Exécution parallèle des tâches d'arrière-plan
                yield Promise.allSettled(backgroundTasks);
            }
            catch (bgError) {
                // Log l'erreur mais ne pas faire échouer la requête principale
                console.error("Background task error in reviewProduct:", bgError);
            }
        }));
        return response;
    }
    catch (error) {
        console.log("====================================");
        console.log("Error in reviewProduct:", error);
        console.log("====================================");
        return response_js_1.default.error(res, "Failed to review product", error.message);
    }
});
exports.reviewProduct = reviewProduct;
