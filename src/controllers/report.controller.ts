import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import prisma from "../model/prisma.client.js";

/**
 * 📋 RÉCUPÉRATION DE TOUS LES SIGNALEMENTS (ADMIN)
 * Permet aux administrateurs de voir tous les signalements d'utilisateurs
 */
export const getAllReports = async (
  req: Request,
  res: Response
): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const status = req.query.status as string; // pending, reviewed, resolved
  const reason = req.query.reason as string; // fraud, spam, abuse, other

  try {
    // Construire les filtres
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (reason) {
      whereClause.reason = reason;
    }

    // Récupérer les signalements avec pagination
    const reports = await prisma.userReport.findMany({
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
    const totalReports = await prisma.userReport.count({
      where: whereClause,
    });

    // Statistiques
    const stats = await prisma.userReport.groupBy({
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
        byReason: stats.reduce((acc: any, stat) => {
          acc[stat.reason] = stat._count._all;
          return acc;
        }, {}),
      },
    };

    ResponseApi.success(res, "Reports retrieved successfully", result);
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    ResponseApi.error(res, "Failed to fetch reports", error.message);
  }
};

/**
 * 📋 RÉCUPÉRATION D'UN SIGNALEMENT PAR ID (ADMIN)
 */
export const getReportById = async (
  req: Request,
  res: Response
): Promise<any> => {
  const reportId = req.params.id;

  try {
    const report = await prisma.userReport.findUnique({
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
      return ResponseApi.notFound(res, "Report not found", 404);
    }

    ResponseApi.success(res, "Report retrieved successfully", report);
  } catch (error: any) {
    console.error("Error fetching report:", error);
    ResponseApi.error(res, "Failed to fetch report", error.message);
  }
};

/**
 * 🔧 TRAITEMENT D'UN SIGNALEMENT (ADMIN)
 * Permet aux administrateurs de traiter un signalement
 */
export const processReport = async (
  req: Request,
  res: Response
): Promise<any> => {
  const reportId = req.params.id;
  const { action, adminNotes } = req.body; // action: 'dismiss', 'warn', 'suspend', 'ban'
  const adminUserId = req.authUser?.id;

  if (!action) {
    return ResponseApi.error(res, "Action is required", 400);
  }

  try {
    const report = await prisma.userReport.findUnique({
      where: { id: reportId },
      include: {
        reportedUser: true,
      },
    });

    if (!report) {
      return ResponseApi.notFound(res, "Report not found", 404);
    }

    // Commencer une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le signalement
      const updatedReport = await tx.userReport.update({
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
      if (action === "suspend") {
        userAction = await tx.user.update({
          where: { id: report.reportedUserId },
          data: { status: "SUSPENDED" },
        });
      } else if (action === "ban") {
        userAction = await tx.user.update({
          where: { id: report.reportedUserId },
          data: { status: "BANNED" },
        });
      }

      // Créer une notification pour l'utilisateur signalé
      if (action !== "dismiss") {
        await tx.notification.create({
          data: {
            userId: report.reportedUserId,
            title: `Votre compte a fait l'objet d'une action administrative`,
            message: `Suite à un signalement, votre compte a été ${
              action === "warn"
                ? "averti"
                : action === "suspend"
                ? "suspendu"
                : "banni"
            }.`,
            type: "ADMIN_ACTION",
            data: {
              reportId,
              action,
              adminNotes,
            },
          },
        });
      }

      return { updatedReport, userAction };
    });

    ResponseApi.success(res, "Report processed successfully", result);
  } catch (error: any) {
    console.error("Error processing report:", error);
    ResponseApi.error(res, "Failed to process report", error.message);
  }
};

/**
 * 📊 STATISTIQUES DES SIGNALEMENTS (ADMIN)
 */
export const getReportsStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const [
      totalReports,
      pendingReports,
      reportsByReason,
      reportsByMonth,
      topReportedUsers,
    ] = await Promise.all([
      // Total des signalements
      prisma.userReport.count(),

      // Signalements en attente
      prisma.userReport.count({
        where: { status: "PENDING" },
      }),

      // Signalements par raison
      prisma.userReport.groupBy({
        by: ["reason"],
        _count: { _all: true },
      }),

      // Signalements par mois (6 derniers mois)
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          COUNT(*) as count
        FROM UserReport 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month DESC
      `,

      // Utilisateurs les plus signalés
      prisma.userReport.groupBy({
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
      byReason: reportsByReason.reduce((acc: any, item) => {
        acc[item.reason] = item._count._all || 0;
        return acc;
      }, {}),
      byMonth: (reportsByMonth as any[]).map((item) => ({
        month: item.month,
        count: Number(item.count), // Convert BigInt to Number
      })),
      topReported: topReportedUsers.map((item) => ({
        userId: item.reportedUserId,
        count: item._count.reportedUserId || 0,
      })),
    };

    ResponseApi.success(res, "Statistics retrieved successfully", statistics);
  } catch (error: any) {
    console.error("Error fetching statistics:", error);
    ResponseApi.error(res, "Failed to fetch statistics", error.message);
  }
};
