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
exports.getCategoryProducts = exports.getUserProducts = exports.getSellerProducts = exports.getHomePageProduct = exports.deleteProductOfSuspendedUser = exports.reviewProduct = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getUserPendingProducts = exports.getPendingProducts = exports.getValidatedProducts = exports.getAllProductsWithoutPagination = exports.getAllProducts = exports.getProductViewStats = exports.recordProductView = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const utils_js_1 = __importDefault(require("../helper/utils.js"));
const mailer_js_1 = require("../utilities/mailer.js");
const reviewProductTemplate_js_1 = require("../templates/reviewProductTemplate.js");
const notification_service_js_1 = require("../services/notification.service.js");
const futurapay_service_js_1 = require("../services/futurapay.service.js");
const upload_js_1 = require("../utilities/upload.js");
const cache_service_js_1 = require("../services/cache.service.js");
const productTransformer_js_1 = __importDefault(require("../utils/productTransformer.js"));
const securityUtils_js_1 = require("../utils/securityUtils.js");
const securityMonitor_js_1 = require("../utils/securityMonitor.js");
// Helper pour construire les filtres de produits validés génériques
const buildValidatedProductFilters = (search, categoryId, cityId, priceMin, priceMax, etat) => {
    const where = Object.assign(Object.assign(Object.assign(Object.assign({ status: "VALIDATED" }, (search && { name: { contains: search } })), (categoryId && { categoryId })), (cityId && { cityId })), (etat && ["NEUF", "OCCASION", "CORRECT"].includes(etat) && { etat }));
    // Gestion des filtres de prix
    const priceFilter = {};
    if (priceMin !== undefined && !isNaN(priceMin))
        priceFilter.gte = priceMin;
    if (priceMax !== undefined && !isNaN(priceMax))
        priceFilter.lte = priceMax;
    if (Object.keys(priceFilter).length > 0)
        where.price = priceFilter;
    return where;
};
// Helper pour construire les filtres de produits
const buildProductFilters = (categoryId, search, cityId, priceMin, priceMax, etat) => {
    const where = Object.assign(Object.assign(Object.assign({ status: "VALIDATED", categoryId }, (search && { name: { contains: search } })), (cityId && { cityId })), (etat && ["NEUF", "OCCASION", "CORRECT"].includes(etat) && { etat }));
    // Gestion des filtres de prix
    const priceFilter = {};
    if (priceMin !== undefined && !isNaN(priceMin))
        priceFilter.gte = priceMin;
    if (priceMax !== undefined && !isNaN(priceMax))
        priceFilter.lte = priceMax;
    if (Object.keys(priceFilter).length > 0)
        where.price = priceFilter;
    return where;
};
// Helper pour extraire et valider les paramètres de pagination
const getPaginationParams = (query) => {
    const page = (0, securityUtils_js_1.sanitizeNumericParam)(query.page, 1, 1, 1000);
    const limit = (0, securityUtils_js_1.sanitizeNumericParam)(query.limit, 10, 1, 100);
    return { page, limit };
};
// Helper pour calculer la pagination
const calculatePagination = (page, limit, totalCount) => {
    const totalPage = Math.ceil(totalCount / limit);
    return {
        currentPage: page,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPage ? page + 1 : null,
        totalPage,
        perpage: limit,
        total: totalCount,
    };
};
// Fonction pour enregistrer une vue d'annonce (utilisateurs connectés uniquement)
const recordProductView = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { productId } = req.params;
        const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return response_js_1.default.error(res, "Utilisateur non authentifié", null, 401);
        }
        if (!productId) {
            return response_js_1.default.error(res, "ID du produit requis", null, 400);
        }
        // Vérifier que le produit existe et est validé
        const product = yield prisma_client_js_1.default.product.findFirst({
            where: {
                id: productId,
                status: "VALIDATED",
            },
        });
        if (!product) {
            return response_js_1.default.notFound(res, "Produit non trouvé ou non validé", 404);
        }
        // Vérifier si l'utilisateur a déjà vu ce produit
        const existingView = yield prisma_client_js_1.default.productView.findUnique({
            where: {
                userId_productId: {
                    userId: userId,
                    productId: productId,
                },
            },
        });
        if (existingView) {
            // L'utilisateur a déjà vu ce produit, ne pas compter à nouveau
            return response_js_1.default.success(res, "Vue déjà enregistrée", {
                isNewView: false,
                viewCount: product.viewCount,
            });
        }
        // Enregistrer la nouvelle vue et incrémenter le compteur en une seule transaction
        const result = yield prisma_client_js_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Créer l'enregistrement de vue
            yield tx.productView.create({
                data: {
                    userId: userId,
                    productId: productId,
                },
            });
            // Incrémenter le compteur de vues du produit
            const updatedProduct = yield tx.product.update({
                where: { id: productId },
                data: {
                    viewCount: {
                        increment: 1,
                    },
                },
            });
            return updatedProduct;
        }));
        response_js_1.default.success(res, "Vue enregistrée avec succès", {
            isNewView: true,
            viewCount: result.viewCount,
        });
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de l'enregistrement de la vue", error.message);
    }
});
exports.recordProductView = recordProductView;
// Fonction pour obtenir les statistiques de vues d'un produit
const getProductViewStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        if (!productId) {
            return response_js_1.default.error(res, "ID du produit requis", null, 400);
        }
        const product = yield prisma_client_js_1.default.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                name: true,
                viewCount: true,
                _count: {
                    select: {
                        views: true, // Compte exact des vues uniques
                    },
                },
            },
        });
        if (!product) {
            return response_js_1.default.notFound(res, "Produit non trouvé", 404);
        }
        response_js_1.default.success(res, "Statistiques de vues récupérées", {
            productId: product.id,
            productName: product.name,
            viewCount: product.viewCount,
            uniqueViews: product._count.views,
        });
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de la récupération des statistiques", error.message);
    }
});
exports.getProductViewStats = getProductViewStats;
// pour recuperer tous les produits avec pagination  [ce ci sera pour les administrateurs]
// ✅ UPDATED: Ajout du support du filtrage par status
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = (0, securityUtils_js_1.sanitizeNumericParam)(req.query.page, 1, 1, 1000);
    const limit = (0, securityUtils_js_1.sanitizeNumericParam)(req.query.limit, 10, 1, 100);
    const offset = (page - 1) * limit;
    const search = (0, securityUtils_js_1.sanitizeSearchParam)(req.query.search);
    const status = req.query.status; // ✅ Récupérer le paramètre status
    // 🔐 Logging de sécurité si des paramètres ont été nettoyés
    if (req.query.search && req.query.search !== search) {
        yield (0, securityMonitor_js_1.logSecurityEvent)({
            type: securityMonitor_js_1.SecurityEventType.PARAMETER_POLLUTION,
            severity: "MEDIUM",
            details: {
                original: String(req.query.search),
                sanitized: search,
                reason: "Search parameter sanitized in getAllProducts",
            },
            blocked: false,
        }, req);
    }
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
                productForfaits: {
                    include: {
                        forfait: true,
                    },
                    where: {
                        isActive: true,
                        expiresAt: {
                            gt: new Date(),
                        },
                    },
                },
            },
        });
        // 🚀 OPTIMISATION N+1: Récupération groupée des reviews (85% réduction requêtes)
        const userIds = products.map((p) => p.userId);
        const reviewsAggregation = yield prisma_client_js_1.default.review.groupBy({
            by: ["userId"],
            where: { userId: { in: userIds } },
            _avg: { rating: true },
            _sum: { rating: true },
            _count: { rating: true },
        });
        // Map optimisée pour O(1) lookup des stats utilisateurs
        const userStatsMap = new Map(reviewsAggregation.map((review) => [
            review.userId,
            {
                totalPoints: review._sum.rating || 0,
                averagePoints: review._avg.rating || null,
                reviewCount: review._count.rating || 0,
            },
        ]));
        // Transformation des produits avec stats utilisateurs et URLs images
        const productsWithUserPoints = products.map((product) => {
            const userStats = userStatsMap.get(product.userId) || {
                totalPoints: 0,
                averagePoints: null,
                reviewCount: 0,
            };
            return Object.assign(Object.assign({}, product), { 
                // �️ Conversion sécurisée des images en URLs complètes
                images: productTransformer_js_1.default.transformProduct(req, product).images, userTotalPoints: userStats.totalPoints, userAveragePoints: userStats.averagePoints });
        });
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
        response_js_1.default.error(res, "Failed to get all products", error.message);
    }
});
exports.getAllProducts = getAllProducts;
//pour recuperer tous les produits sans pagination [administrateur]
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
        response_js_1.default.error(res, "Failed to get all products", error.message);
    }
});
exports.getAllProductsWithoutPagination = getAllProductsWithoutPagination;
//pour recuperer tous les produits avec un status = VALIDATED, pagination et recherche [pour les utilisateurs]
const getValidatedProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit } = getPaginationParams(req.query);
    const offset = (page - 1) * limit;
    const search = (0, securityUtils_js_1.sanitizeSearchParam)(req.query.search);
    const categoryId = req.query.categoryId;
    const cityId = req.query.cityId;
    // 🔐 Logging de sécurité si des paramètres ont été nettoyés
    if (req.query.search && req.query.search !== search) {
        yield (0, securityMonitor_js_1.logSecurityEvent)({
            type: securityMonitor_js_1.SecurityEventType.PARAMETER_POLLUTION,
            severity: "MEDIUM",
            details: {
                original: String(req.query.search),
                sanitized: search,
                reason: "Search parameter sanitized in getValidatedProducts",
            },
            blocked: false,
        }, req);
    }
    // ✅ NOUVEAUX FILTRES - Prix et État (sécurisés)
    const priceMin = req.query.priceMin
        ? (0, securityUtils_js_1.sanitizeNumericParam)(req.query.priceMin, 0, 0, 10000000)
        : undefined;
    const priceMax = req.query.priceMax
        ? (0, securityUtils_js_1.sanitizeNumericParam)(req.query.priceMax, Number.MAX_SAFE_INTEGER, 0, 10000000)
        : undefined;
    const etat = req.query.etat;
    try {
        // Construction des filtres avec le helper
        const where = buildValidatedProductFilters(search, categoryId, cityId, priceMin, priceMax, etat);
        // ✅ CORRECTION : Récupérer TOUS les produits correspondants AVANT pagination
        const allMatchingProducts = yield prisma_client_js_1.default.product.findMany({
            // ❌ SUPPRIMÉ : skip et take pour récupérer TOUS les produits
            orderBy: { createdAt: "desc" },
            where,
            include: {
                category: true,
                city: true,
                user: true,
                // On inclut les forfaits actifs pour pouvoir trier côté serveur
                productForfaits: {
                    where: { isActive: true, expiresAt: { gt: new Date() } },
                    include: { forfait: true },
                },
            },
        });
        const forfaitPriority = {
            PREMIUM: 1, // 1. Premium (regroupe tous les forfaits)
            TOP_ANNONCE: 2, // 2. Top (en tête de liste)
            A_LA_UNE: 3, // 3. À la une
            URGENT: 4, // 4. Urgent (badge urgent)
        };
        const getPriority = (p) => {
            if (!p.productForfaits || p.productForfaits.length === 0)
                return Number.MAX_SAFE_INTEGER;
            // On prend la meilleure (la plus haute priorité = plus petit nombre)
            const priorities = p.productForfaits.map((pf) => { var _a, _b; return (_b = forfaitPriority[(_a = pf.forfait) === null || _a === void 0 ? void 0 : _a.type]) !== null && _b !== void 0 ? _b : Number.MAX_SAFE_INTEGER; });
            return Math.min(...priorities);
        };
        // ✅ CORRECTION : TRI COMPLET AVANT pagination
        const sortedByForfait = allMatchingProducts.sort((a, b) => {
            const pa = getPriority(a);
            const pb = getPriority(b);
            if (pa !== pb)
                return pa - pb; // priorité ascendante (1 = premium first)
            // Si même priorité, trier par date décroissante
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        // ✅ CORRECTION : Pagination APRÈS tri complet
        const paginatedProducts = sortedByForfait.slice(offset, offset + limit);
        // ✅ CORRECTION : Total basé sur TOUS les produits correspondants
        const total = allMatchingProducts.length;
        const productsWithImageUrls = productTransformer_js_1.default.transformProductsWithForfaits(req, paginatedProducts);
        const links = calculatePagination(page, limit, total);
        response_js_1.default.success(res, "Validated products retrieved successfully!", {
            products: productsWithImageUrls,
            links,
        });
    }
    catch (error) {
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
        response_js_1.default.error(res, "Failed to retrieve pending products", error.message);
    }
});
exports.getPendingProducts = getPendingProducts;
// ✅ NOUVEAU: Endpoint pour que les utilisateurs récupèrent leurs propres produits en attente
const getUserPendingProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return response_js_1.default.error(res, "User not authenticated", null, 401);
        }
        const userPendingProducts = yield prisma_client_js_1.default.product.findMany({
            where: {
                status: "PENDING",
                userId: userId,
            },
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                city: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        // ✅ CORRECTION: Transformation des images en URLs complètes comme dans les autres endpoints
        const userPendingProductsWithImageUrls = productTransformer_js_1.default.transformProducts(req, userPendingProducts);
        response_js_1.default.success(res, "User pending products retrieved successfully", {
            products: userPendingProductsWithImageUrls,
            links: {
                total: userPendingProductsWithImageUrls.length,
            },
        });
    }
    catch (error) {
        response_js_1.default.error(res, "Failed to retrieve user pending products", error.message);
    }
});
exports.getUserPendingProducts = getUserPendingProducts;
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
        const productWithImageUrls = productTransformer_js_1.default.transformProduct(req, result);
        response_js_1.default.success(res, "Product retrieved successfully", productWithImageUrls);
    }
    catch (error) {
        response_js_1.default.error(res, "Failed to get product by ID", error.message);
    }
});
exports.getProductById = getProductById;
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { name, price, quantity, description, categoryId, cityId, etat, quartier, telephone, forfaitType, } = req.body;
        if (!((_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id)) {
            return response_js_1.default.error(res, "User not authenticated", null, 401);
        }
        const userId = (_b = req.authUser) === null || _b === void 0 ? void 0 : _b.id;
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
        if (!name ||
            !price ||
            !quantity ||
            !description ||
            !categoryId ||
            !cityId ||
            !etat) {
            return response_js_1.default.error(res, "Tous les champs sont requis", null, 400);
        }
        // 🔐 Upload sécurisé des images avec optimisation
        if (!req.files || !req.files.images) {
            return response_js_1.default.error(res, "Au moins une image est requise", null, 400);
        }
        // Utilisation du système d'upload sécurisé
        const savedImages = yield (0, upload_js_1.uploadProductImages)(req);
        // Création du produit
        const productCreateData = {
            name,
            price: parseFloat(price),
            quantity: parseInt(quantity),
            description,
            images: savedImages,
            categoryId,
            userId,
            cityId,
            status: "PENDING",
            etat,
            quartier,
            telephone,
        };
        const product = yield prisma_client_js_1.default.product.create({
            data: productCreateData,
        }); // Si le frontend a demandé un forfait lors de la création
        if (forfaitType) {
            const forfait = yield prisma_client_js_1.default.forfait.findFirst({
                where: { type: forfaitType },
            });
            if (forfait) {
                // Créer réservation (isActive=false)
                const now = new Date();
                const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);
                const productForfait = yield prisma_client_js_1.default.productForfait.create({
                    data: {
                        productId: product.id,
                        forfaitId: forfait.id,
                        activatedAt: now,
                        expiresAt,
                        isActive: false,
                    },
                });
                const transactionData = {
                    currency: "XAF",
                    amount: forfait.price,
                    customer_transaction_id: productForfait.id,
                    country_code: "CM",
                    customer_first_name: ((_c = req.authUser) === null || _c === void 0 ? void 0 : _c.firstName) || "Client",
                    customer_last_name: ((_d = req.authUser) === null || _d === void 0 ? void 0 : _d.lastName) || "",
                    customer_phone: req.body.telephone || product.telephone || "",
                    customer_email: ((_e = req.authUser) === null || _e === void 0 ? void 0 : _e.email) || "",
                };
                const securedUrl = (0, futurapay_service_js_1.initiateFuturaPayment)(transactionData);
                const productResponse = productTransformer_js_1.default.transformProduct(req, product);
                return response_js_1.default.success(res, "Produit créé - paiement forfait requis", {
                    product: productResponse,
                    paymentUrl: securedUrl,
                    productForfaitId: productForfait.id,
                }, 201);
            }
        }
        if (userId) {
            yield (0, notification_service_js_1.createNotification)(userId, "Annonce créée avec succès", `Votre produit "${name}" a été créé avec succès et est en attente de validation par nos équipes...`, {
                type: "PRODUCT",
                link: `/product/${product.id}`,
            });
        }
        const productResponse = productTransformer_js_1.default.transformProduct(req, product);
        // 🚀 CACHE: Invalider le cache après création d'un produit
        cache_service_js_1.cacheService.invalidateHomepageProducts();
        response_js_1.default.success(res, "Produit créé avec succès", productResponse, 201);
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de la création du produit", error.message);
    }
});
exports.createProduct = createProduct;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
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
            // 🔐 Upload sécurisé des nouvelles images
            if (!Array.isArray(newImages))
                newImages = [newImages];
            // Supprimer les anciennes images si besoin
            for (const oldImg of images) {
                yield utils_js_1.default.deleteFile(oldImg);
            }
            // Utilisation du système d'upload sécurisé
            images = yield (0, upload_js_1.uploadProductImages)(req);
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
        // Si un forfait est demandé à la mise à jour
        const { forfaitType } = req.body;
        if (forfaitType) {
            const forfait = yield prisma_client_js_1.default.forfait.findFirst({
                where: { type: forfaitType },
            });
            if (forfait) {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);
                const productForfait = yield prisma_client_js_1.default.productForfait.create({
                    data: {
                        productId: updatedProduct.id,
                        forfaitId: forfait.id,
                        activatedAt: now,
                        expiresAt,
                        isActive: false,
                    },
                });
                const transactionData = {
                    currency: "XAF",
                    amount: forfait.price,
                    customer_transaction_id: productForfait.id,
                    country_code: "CM",
                    customer_first_name: ((_a = req.authUser) === null || _a === void 0 ? void 0 : _a.firstName) || "Client",
                    customer_last_name: ((_b = req.authUser) === null || _b === void 0 ? void 0 : _b.lastName) || "",
                    customer_phone: req.body.telephone || updatedProduct.telephone || "",
                    customer_email: ((_c = req.authUser) === null || _c === void 0 ? void 0 : _c.email) || "",
                };
                const securedUrl = (0, futurapay_service_js_1.initiateFuturaPayment)(transactionData);
                const productWithImageUrls = productTransformer_js_1.default.transformProduct(req, updatedProduct);
                return response_js_1.default.success(res, "Produit mis à jour - paiement forfait requis", {
                    product: productWithImageUrls,
                    paymentUrl: securedUrl,
                    productForfaitId: productForfait.id,
                });
            }
        }
        const productWithImageUrls = productTransformer_js_1.default.transformProduct(req, updatedProduct);
        // 🚀 CACHE: Invalider le cache après mise à jour d'un produit
        cache_service_js_1.cacheService.invalidateHomepageProducts();
        response_js_1.default.success(res, "Produit mis à jour avec succès", productWithImageUrls);
    }
    catch (error) {
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
        // Suppression du produit et de ses dépendances (cascade automatique)
        // seront automatiquement supprimés
        const result = yield prisma_client_js_1.default.product.delete({
            where: { id },
        });
        response_js_1.default.success(res, "Product deleted successfully", result);
    }
    catch (error) {
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
            // Récupération des informations du produit
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
        return response_js_1.default.error(res, "Failed to review product", error.message);
    }
});
exports.reviewProduct = reviewProduct;
// Méthode pour supprimer tous les produits d'un utilisateur suspendu
const deleteProductOfSuspendedUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    try {
        // Validation de l'entrée
        if (!userId) {
            return response_js_1.default.error(res, "L'ID utilisateur est requis", null, 400);
        }
        // Vérifier que l'utilisateur est bien suspendu
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: userId },
            select: { status: true, firstName: true, lastName: true },
        });
        if (!user) {
            return response_js_1.default.notFound(res, "Utilisateur non trouvé", 404);
        }
        if (user.status !== "SUSPENDED") {
            return response_js_1.default.error(res, "Cette action n'est possible que pour les utilisateurs suspendus", null, 400);
        }
        // Récupérer d'abord tous les produits pour supprimer les images
        const products = yield prisma_client_js_1.default.product.findMany({
            where: { userId },
            select: { id: true, images: true },
        });
        if (products.length === 0) {
            return response_js_1.default.success(res, "Aucun produit trouvé pour cet utilisateur suspendu", { count: 0 });
        }
        // Supprimer les images associées
        const imagePromises = products.flatMap((product) => {
            const images = product.images;
            return images.map((img) => utils_js_1.default.deleteFile(img));
        });
        // Attendre que toutes les suppressions d'images soient terminées
        yield Promise.allSettled(imagePromises);
        // Supprimer tous les produits
        const result = yield prisma_client_js_1.default.product.deleteMany({
            where: { userId },
        });
        // ✅ INVALIDATION COMPLÈTE DU CACHE DES PRODUITS après suppression
        cache_service_js_1.cacheService.invalidateAllProducts();
        console.log(`🗑️ [MANUAL CLEANUP] Cache produits invalidé après suppression manuelle de ${result.count} produits`);
        const userName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : "l'utilisateur suspendu";
        return response_js_1.default.success(res, `${result.count} produits de ${userName} ont été supprimés avec succès`, { count: result.count });
    }
    catch (error) {
        return response_js_1.default.error(res, "Échec de la suppression des produits de l'utilisateur suspendu", error.message);
    }
});
exports.deleteProductOfSuspendedUser = deleteProductOfSuspendedUser;
const getHomePageProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Ordre de priorité des forfaits pour la page d'accueil (HOMEPAGE)
    // 1=À la Une, 2=Premium, 3=Top Annonce, 4=Urgent, 5=Sans forfait
    const forfaitPriority = {
        A_LA_UNE: 1, // Priorité maximale homepage
        PREMIUM: 2, // Deuxième priorité homepage
        TOP_ANNONCE: 3, // Troisième priorité homepage
        URGENT: 4, // Quatrième priorité homepage
    };
    const limit = parseInt(req.query.limit) || 10;
    try {
        // 🚀 CACHE: Vérifier d'abord si les données sont en cache
        const cachedData = cache_service_js_1.cacheService.getHomepageProducts(limit);
        if (cachedData) {
            return response_js_1.default.success(res, "Produits homepage récupérés avec succès (cache)", cachedData);
        }
        // Récupérer TOUS les produits validés
        const allProducts = yield prisma_client_js_1.default.product.findMany({
            where: { status: "VALIDATED" },
            orderBy: { createdAt: "desc" },
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
        // Fonction pour obtenir la priorité d'un produit
        const getProductPriority = (product) => {
            if (!product.productForfaits || product.productForfaits.length === 0) {
                return Number.MAX_SAFE_INTEGER; // Pas de forfait = priorité la plus faible
            }
            // Trouver la meilleure priorité parmi tous les forfaits actifs
            const priorities = product.productForfaits.map((pf) => { var _a, _b; return (_b = forfaitPriority[(_a = pf.forfait) === null || _a === void 0 ? void 0 : _a.type]) !== null && _b !== void 0 ? _b : Number.MAX_SAFE_INTEGER; });
            return Math.min(...priorities); // Plus petit = meilleur
        };
        // Trier tous les produits selon l'ordre de priorité HOMEPAGE
        const sortedProducts = allProducts.sort((a, b) => {
            const priorityA = getProductPriority(a);
            const priorityB = getProductPriority(b);
            if (priorityA !== priorityB) {
                return priorityA - priorityB; // Tri par priorité forfait
            }
            // Si même priorité, tri par date décroissante (plus récent first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        // Prendre les premiers produits selon la limite
        const products = sortedProducts.slice(0, limit);
        // Déterminer la priorité utilisée (pour debug/info)
        const usedPriority = products.length > 0
            ? (() => {
                const firstProductPriority = getProductPriority(products[0]);
                if (firstProductPriority === Number.MAX_SAFE_INTEGER)
                    return null;
                // Trouver le type de forfait correspondant à cette priorité
                for (const [type, priority] of Object.entries(forfaitPriority)) {
                    if (priority === firstProductPriority)
                        return type;
                }
                return null;
            })()
            : null;
        // Conversion des images en URLs complètes
        const productsWithImageUrls = productTransformer_js_1.default.transformProductsWithForfaits(req, products);
        const responseData = {
            products: productsWithImageUrls,
            usedPriority,
            totalProducts: allProducts.length,
            priorityDistribution: {
                aLaUne: allProducts.filter((p) => getProductPriority(p) === 1).length,
                premium: allProducts.filter((p) => getProductPriority(p) === 2).length,
                topAnnonce: allProducts.filter((p) => getProductPriority(p) === 3)
                    .length,
                urgent: allProducts.filter((p) => getProductPriority(p) === 4).length,
                sansForfait: allProducts.filter((p) => getProductPriority(p) === Number.MAX_SAFE_INTEGER).length,
            },
        };
        // 🚀 CACHE: Mettre en cache le résultat
        cache_service_js_1.cacheService.setHomepageProducts(limit, responseData);
        response_js_1.default.success(res, "Produits homepage récupérés avec succès", responseData);
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de la récupération des produits homepage", error.message);
    }
});
exports.getHomePageProduct = getHomePageProduct;
// ✅ NOUVEAU: Récupérer les produits validés d'un vendeur spécifique
const getSellerProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sellerId = req.params.sellerId;
    const { page, limit } = getPaginationParams(req.query);
    const search = (0, securityUtils_js_1.sanitizeSearchParam)(req.query.search);
    const offset = (page - 1) * limit;
    try {
        // Vérifier que le vendeur existe
        const seller = yield prisma_client_js_1.default.user.findUnique({
            where: { id: sellerId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                phone: true,
                email: true,
            },
        });
        if (!seller) {
            return response_js_1.default.error(res, "Vendeur introuvable", null, 404);
        }
        const where = Object.assign({ status: "VALIDATED", userId: sellerId }, (search && { name: { contains: search } }));
        // Récupération des produits avec pagination
        const [products, totalCount] = yield Promise.all([
            prisma_client_js_1.default.product.findMany({
                skip: offset,
                take: limit,
                orderBy: { createdAt: "desc" },
                where,
                include: {
                    category: true,
                    city: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            phone: true,
                        },
                    },
                },
            }),
            prisma_client_js_1.default.product.count({ where }),
        ]);
        // Transformation des URLs d'images
        const productsWithImageUrls = productTransformer_js_1.default.transformProducts(req, products);
        // Calcul de la pagination
        const links = calculatePagination(page, limit, totalCount);
        response_js_1.default.success(res, `Produits du vendeur ${seller.firstName} ${seller.lastName} récupérés avec succès`, {
            products: productsWithImageUrls,
            links,
            seller: {
                id: seller.id,
                firstName: seller.firstName,
                lastName: seller.lastName,
                name: `${seller.firstName} ${seller.lastName}`,
                avatar: seller.avatar,
                phone: seller.phone,
                email: seller.email,
            },
        });
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de la récupération des produits du vendeur", error.message);
    }
});
exports.getSellerProducts = getSellerProducts;
// ✅ NOUVEAU: Récupérer les produits validés d'un utilisateur spécifique (pour profil public)
const getUserProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    const { page, limit } = getPaginationParams(req.query);
    const offset = (page - 1) * limit;
    try {
        // Vérifier que l'utilisateur existe
        const user = yield prisma_client_js_1.default.user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true, lastName: true, avatar: true },
        });
        if (!user) {
            return response_js_1.default.error(res, "Utilisateur introuvable", null, 404);
        }
        const where = {
            status: "VALIDATED",
            userId: userId,
        };
        // Récupération des produits avec pagination
        const [products, totalCount] = yield Promise.all([
            prisma_client_js_1.default.product.findMany({
                skip: offset,
                take: limit,
                orderBy: { createdAt: "desc" },
                where,
                include: {
                    category: true,
                    city: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                        },
                    },
                },
            }),
            prisma_client_js_1.default.product.count({ where }),
        ]);
        // Transformation des URLs d'images
        const productsWithImageUrls = productTransformer_js_1.default.transformProducts(req, products);
        // Calcul de la pagination
        const links = calculatePagination(page, limit, totalCount);
        response_js_1.default.success(res, `Produits de ${user.firstName} ${user.lastName} récupérés avec succès`, {
            products: productsWithImageUrls,
            links,
            user: {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`,
                avatar: user.avatar,
            },
        });
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de la récupération des produits de l'utilisateur", error.message);
    }
});
exports.getUserProducts = getUserProducts;
// ✅ NOUVEAU: Récupérer les produits validés d'une catégorie spécifique
const getCategoryProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = req.params.categoryId;
    const { page, limit } = getPaginationParams(req.query);
    const offset = (page - 1) * limit;
    const search = (0, securityUtils_js_1.sanitizeSearchParam)(req.query.search);
    // Filtres additionnels
    const cityId = req.query.cityId;
    const priceMin = req.query.priceMin
        ? (0, securityUtils_js_1.sanitizeNumericParam)(req.query.priceMin, 0, 0, 10000000)
        : undefined;
    const priceMax = req.query.priceMax
        ? (0, securityUtils_js_1.sanitizeNumericParam)(req.query.priceMax, Number.MAX_SAFE_INTEGER, 0, 10000000)
        : undefined;
    const etat = req.query.etat;
    try {
        // Vérifier que la catégorie existe
        const category = yield prisma_client_js_1.default.category.findUnique({
            where: { id: categoryId },
            select: { id: true, name: true, description: true },
        });
        if (!category) {
            return response_js_1.default.error(res, "Catégorie introuvable", null, 404);
        }
        // Construction des filtres avec le helper
        const where = buildProductFilters(categoryId, search, cityId, priceMin, priceMax, etat);
        // Récupération des produits avec pagination
        const [products, totalCount] = yield Promise.all([
            prisma_client_js_1.default.product.findMany({
                skip: offset,
                take: limit,
                orderBy: { createdAt: "desc" },
                where,
                include: {
                    category: true,
                    city: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                        },
                    },
                },
            }),
            prisma_client_js_1.default.product.count({ where }),
        ]);
        // Transformation des URLs d'images
        const productsWithImageUrls = productTransformer_js_1.default.transformProducts(req, products);
        // Calcul de la pagination
        const links = calculatePagination(page, limit, totalCount);
        response_js_1.default.success(res, `Produits de la catégorie "${category.name}" récupérés avec succès`, {
            products: productsWithImageUrls,
            links,
            category: {
                id: category.id,
                name: category.name,
                description: category.description,
            },
        });
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de la récupération des produits de la catégorie", error.message);
    }
});
exports.getCategoryProducts = getCategoryProducts;
