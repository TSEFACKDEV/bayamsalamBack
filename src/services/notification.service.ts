import prisma from "../model/prisma.client.js";
import { getIO } from "../utilities/socket.js";

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  options?: { data?: any; link?: string; type?: string }
) => {
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

  // Émettre en temps réel vers la room userId (si connecté)
  try {
    const io = getIO();
    io.to(userId).emit("notification", notification);
  } catch (e) {
    // socket pas initialisé -> ignore
    console.warn("Socket.io not initialized, skipping real-time emit.");
  }

  return notification;
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