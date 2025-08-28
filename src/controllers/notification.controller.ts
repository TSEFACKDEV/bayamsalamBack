import { Request, Response } from "express";
import ResponseApi from "../helper/response.js";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notification.service.js";
import prisma from "../model/prisma.client.js";

export const listNotifications = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return ResponseApi.error(res, "Unauthorized", null, 401);
    const notifs = await getUserNotifications(userId);
    return ResponseApi.success(res, "Notifications fetched", notifs, 200);
  } catch (e: any) {
    return ResponseApi.error(
      res,
      "Failed to fetch notifications",
      e.message,
      500
    );
  }
};

export const markRead = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
    const notif = await markNotificationRead(id);
    return ResponseApi.success(res, "Notification marked read", notif, 200);
  } catch (e: any) {
    return ResponseApi.error(
      res,
      "Failed to mark notification read",
      e.message,
      500
    );
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return ResponseApi.error(res, "Unauthorized", null, 401);

    await markAllNotificationsRead(userId);
    return ResponseApi.success(
      res,
      "All notifications marked as read",
      null,
      200
    );
  } catch (e: any) {
    return ResponseApi.error(
      res,
      "Failed to mark all notifications as read",
      e.message,
      500
    );
  }
};

const deleteOldNotifications = async () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const deleted = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: fiveDaysAgo,
      },
    },
  });

    console.log(`Deleted ${deleted.count} notifications older than 5 days.`);
}

deleteOldNotifications()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => {
    prisma.$disconnect();
  });