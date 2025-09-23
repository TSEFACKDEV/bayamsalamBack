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
exports.getReportsStatistics = exports.processReport = exports.getReportById = exports.getAllReports = void 0;
const response_js_1 = __importDefault(require("../helper/response.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const utils_js_1 = __importDefault(require("../helper/utils.js"));
const cache_service_js_1 = require("../services/cache.service.js");
const getAllReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // pending, reviewed, resolved
    const reason = req.query.reason; // fraud, spam, abuse, other
    const search = req.query.search || ""; // 🆕 SUPPORT RECHERCHE TEXTUELLE
    try {
        // 🆕 Construction des filtres combinés (recherche + status + reason)
        const whereClause = {};
        // Filtre par statut
        if (status) {
            whereClause.status = status;
        }
        // Filtre par raison
        if (reason) {
            whereClause.reason = reason;
        }
        // 🆕 Filtre de recherche textuelle (nom, email de l'utilisateur signalé + détails du signalement)
        if (search) {
            whereClause.OR = [
                {
                    reportedUser: {
                        OR: [
                            { firstName: { contains: search } },
                            { lastName: { contains: search } },
                            { email: { contains: search } },
                        ],
                    },
                },
                {
                    reportingUser: {
                        OR: [
                            { firstName: { contains: search } },
                            { lastName: { contains: search } },
                            { email: { contains: search } },
                        ],
                    },
                },
                { details: { contains: search } },
                { reason: { contains: search } },
            ];
        }
        // Récupérer les signalements avec pagination
        const reports = yield prisma_client_js_1.default.userReport.findMany({
            skip: offset,
            take: limit,
            where: whereClause,
            include: {
                reportedUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true,
                        status: true,
                    },
                },
                reportingUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        // Compter le total
        const totalReports = yield prisma_client_js_1.default.userReport.count({
            where: whereClause,
        });
        // Statistiques
        const stats = yield prisma_client_js_1.default.userReport.groupBy({
            by: ["reason"],
            _count: {
                _all: true,
            },
        });
        const result = {
            reports,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalReports / limit),
                totalItems: totalReports,
                hasNext: page * limit < totalReports,
                hasPrev: page > 1,
            },
            statistics: {
                total: totalReports,
                byReason: stats.reduce((acc, stat) => {
                    acc[stat.reason] = stat._count._all;
                    return acc;
                }, {}),
            },
        };
        response_js_1.default.success(res, "Reports retrieved successfully", result);
    }
    catch (error) {
        console.error("Error fetching reports:", error);
        response_js_1.default.error(res, "Failed to fetch reports", error.message);
    }
});
exports.getAllReports = getAllReports;
/**
 * 📋 RÉCUPÉRATION D'UN SIGNALEMENT PAR ID (ADMIN)
 */
const getReportById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const reportId = req.params.id;
    try {
        const report = yield prisma_client_js_1.default.userReport.findUnique({
            where: { id: reportId },
            include: {
                reportedUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true,
                        status: true,
                        createdAt: true,
                        products: {
                            select: {
                                id: true,
                                name: true,
                                status: true,
                            },
                        },
                        reportsReceived: {
                            select: {
                                id: true,
                                reason: true,
                                createdAt: true,
                            },
                        },
                    },
                },
                reportingUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!report) {
            return response_js_1.default.notFound(res, "Report not found", 404);
        }
        response_js_1.default.success(res, "Report retrieved successfully", report);
    }
    catch (error) {
        console.error("Error fetching report:", error);
        response_js_1.default.error(res, "Failed to fetch report", error.message);
    }
});
exports.getReportById = getReportById;
const processReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const reportId = req.params.id;
    const { action, adminNotes } = req.body; // action: 'dismiss', 'warn', 'suspend', 'ban'
    const adminUserId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.id;
    if (!action) {
        return response_js_1.default.error(res, "Action is required", 400);
    }
    try {
        const report = yield prisma_client_js_1.default.userReport.findUnique({
            where: { id: reportId },
            include: {
                reportedUser: true,
            },
        });
        if (!report) {
            return response_js_1.default.notFound(res, "Report not found", 404);
        }
        // Commencer une transaction
        const result = yield prisma_client_js_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Mettre à jour le signalement
            const updatedReport = yield tx.userReport.update({
                where: { id: reportId },
                data: {
                    status: action === "dismiss" ? "DISMISSED" : "PROCESSED",
                    processedAt: new Date(),
                    processedBy: adminUserId,
                    adminNotes,
                },
            });
            // Appliquer l'action sur l'utilisateur signalé selon le type d'action
            let userAction = null;
            let deletedProductsInfo = null;
            if (action === "suspend") {
                // Supprimer les produits avant suspension
                const userProducts = yield tx.product.findMany({
                    where: { userId: report.reportedUserId },
                    select: { id: true, images: true, name: true },
                });
                if (userProducts.length > 0) {
                    // Supprimer les images associées aux produits
                    const imagePromises = userProducts.flatMap((product) => {
                        const images = product.images;
                        return images.map((img) => utils_js_1.default.deleteFile(img));
                    });
                    yield Promise.allSettled(imagePromises);
                    // Supprimer tous les produits
                    const deleteResult = yield tx.product.deleteMany({
                        where: { userId: report.reportedUserId },
                    });
                    deletedProductsInfo = {
                        count: deleteResult.count,
                        products: userProducts.map((p) => p.name),
                    };
                    // ✅ INVALIDATION COMPLÈTE DU CACHE DES PRODUITS après suppression
                    cache_service_js_1.cacheService.invalidateAllProducts();
                    console.log(`🗑️ [SUSPEND] Cache produits invalidé après suppression de ${deleteResult.count} produits`);
                }
                userAction = yield tx.user.update({
                    where: { id: report.reportedUserId },
                    data: { status: "SUSPENDED" },
                });
            }
            else if (action === "ban") {
                // ✅ AUTOMATIQUE : Supprimer les produits avant bannissement
                const userProducts = yield tx.product.findMany({
                    where: { userId: report.reportedUserId },
                    select: { id: true, images: true, name: true },
                });
                if (userProducts.length > 0) {
                    // Supprimer les images associées aux produits
                    const imagePromises = userProducts.flatMap((product) => {
                        const images = product.images;
                        return images.map((img) => utils_js_1.default.deleteFile(img));
                    });
                    yield Promise.allSettled(imagePromises);
                    // Supprimer tous les produits
                    const deleteResult = yield tx.product.deleteMany({
                        where: { userId: report.reportedUserId },
                    });
                    deletedProductsInfo = {
                        count: deleteResult.count,
                        products: userProducts.map((p) => p.name),
                    };
                    // ✅ INVALIDATION COMPLÈTE DU CACHE DES PRODUITS après suppression
                    cache_service_js_1.cacheService.invalidateAllProducts();
                    console.log(`🗑️ [BAN] Cache produits invalidé après suppression de ${deleteResult.count} produits`);
                }
                userAction = yield tx.user.update({
                    where: { id: report.reportedUserId },
                    data: { status: "BANNED" },
                });
            }
            // Créer une notification pour l'utilisateur signalé
            if (action !== "dismiss") {
                const baseMessage = `Suite à un signalement, votre compte a été ${action === "warn"
                    ? "averti"
                    : action === "suspend"
                        ? "suspendu"
                        : "banni"}.`;
                const productMessage = deletedProductsInfo
                    ? ` Vos ${deletedProductsInfo.count} produit(s) ont également été supprimés.`
                    : "";
                yield tx.notification.create({
                    data: {
                        userId: report.reportedUserId,
                        title: `Votre compte a fait l'objet d'une action administrative`,
                        message: baseMessage + productMessage,
                        type: "ADMIN_ACTION",
                        data: Object.assign({ reportId,
                            action,
                            adminNotes }, (deletedProductsInfo && {
                            deletedProducts: deletedProductsInfo,
                        })),
                    },
                });
            }
            return { updatedReport, userAction };
        }));
        response_js_1.default.success(res, "Report processed successfully", result);
    }
    catch (error) {
        console.error("Error processing report:", error);
        response_js_1.default.error(res, "Failed to process report", error.message);
    }
});
exports.processReport = processReport;
/**
 * 📊 STATISTIQUES DES SIGNALEMENTS (ADMIN)
 */
const getReportsStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [totalReports, pendingReports, reportsByReason, reportsByMonth, topReportedUsers,] = yield Promise.all([
            // Total des signalements
            prisma_client_js_1.default.userReport.count(),
            // Signalements en attente
            prisma_client_js_1.default.userReport.count({
                where: { status: "PENDING" },
            }),
            // Signalements par raison
            prisma_client_js_1.default.userReport.groupBy({
                by: ["reason"],
                _count: { _all: true },
            }),
            // Signalements par mois (6 derniers mois)
            prisma_client_js_1.default.$queryRaw `
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          COUNT(*) as count
        FROM UserReport 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month DESC
      `,
            // Utilisateurs les plus signalés
            prisma_client_js_1.default.userReport.groupBy({
                by: ["reportedUserId"],
                _count: {
                    reportedUserId: true,
                },
                orderBy: {
                    _count: {
                        reportedUserId: "desc",
                    },
                },
                take: 10,
            }),
        ]);
        const statistics = {
            overview: {
                total: totalReports,
                pending: pendingReports,
                processed: totalReports - pendingReports,
            },
            byReason: reportsByReason.reduce((acc, item) => {
                acc[item.reason] = item._count._all || 0;
                return acc;
            }, {}),
            byMonth: reportsByMonth.map((item) => ({
                month: item.month,
                count: Number(item.count), // Convert BigInt to Number
            })),
            topReported: topReportedUsers.map((item) => ({
                userId: item.reportedUserId,
                count: item._count.reportedUserId || 0,
            })),
        };
        response_js_1.default.success(res, "Statistics retrieved successfully", statistics);
    }
    catch (error) {
        console.error("Error fetching statistics:", error);
        response_js_1.default.error(res, "Failed to fetch statistics", error.message);
    }
});
exports.getReportsStatistics = getReportsStatistics;
