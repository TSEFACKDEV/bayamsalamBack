import prisma from "../model/prisma.client.js";
import { getIO } from "../utilities/socket.js";

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  options?: { data?: any; link?: string; type?: string }
) => {
  try {
    // ✅ Création de la notification en base (opération critique)
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        data: options?.data ?? null,
        link: options?.link ?? null,
        type: options?.type ?? null,
      },
    });

    // ✅ Émission Socket.io en arrière-plan (non-critique)
    // Utiliser setImmediate pour ne pas bloquer la réponse
    setImmediate(() => {
      try {
        const io = getIO();
        io.to(userId).emit("notification", notification);
      } catch (socketError) {
        // Socket pas initialisé ou utilisateur déconnecté -> ignore silencieusement
        console.warn(
          `Socket.io notification failed for user ${userId}:`,
          socketError
        );
      }
    });

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error; // Re-throw pour que l'appelant puisse gérer l'erreur
  }
};

export const getUserNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const markNotificationRead = async (notificationId: string) => {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};
