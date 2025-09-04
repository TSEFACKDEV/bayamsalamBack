import { Request, Response } from "express";
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";
import { placePayment, checkPayment } from "../helper/monetbil.helper.js";

// Activation d'un forfait sur un produit (après paiement)
export const activateForfait = async (req: Request, res: Response): Promise<any> => {
  const { productId, forfaitType } = req.body;
  try {
    const forfait = await prisma.forfait.findFirst({ where: { type: forfaitType } });
    if (!forfait) return ResponseApi.notFound(res, "Forfait non trouvé", 404);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);

    await prisma.productForfait.create({
      data: {
        productId,
        forfaitId: forfait.id,
        activatedAt: now,
        expiresAt,
        isActive: true,
      },
    });

    ResponseApi.success(res, "Forfait activé sur le produit", null);
  } catch (error: any) {
    ResponseApi.error(res, "Erreur activation forfait", error.message);
  }
};

// Activation d'un forfait avec paiement Monetbil
export const payAndActivateForfait = async (req: Request, res: Response): Promise<any> => {
  const { productId, forfaitType, phonenumber, operator } = req.body;
  try {
    const forfait = await prisma.forfait.findFirst({ where: { type: forfaitType } });
    if (!forfait) return ResponseApi.notFound(res, "Forfait non trouvé", 404);

    // Lancer le paiement Monetbil
    const payment = await placePayment({
      phonenumber,
      amount: forfait.price,
      notify_url: "https://tonserveur.com/monetbil/notifications",
      country: "CM",
      currency: "XAF",
      operator: operator || "CM_MTNMOBILEMONEY",
      item_ref: productId,
      payment_ref: `${productId}_${Date.now()}`,
      // Optionnel: infos utilisateur
      first_name: req.authUser?.firstName,
      last_name: req.authUser?.lastName,
      email: req.authUser?.email,
    });

    if (payment.status !== "REQUEST_ACCEPTED") {
      return ResponseApi.error(res, "Paiement non accepté", payment.message, 400);
    }

    // Retourne l'URL de paiement ou l'ID pour suivi
    ResponseApi.success(res, "Paiement lancé, en attente de validation", {
      paymentId: payment.paymentId,
      payment_url: payment.payment_url,
      channel_ussd: payment.channel_ussd,
      channel_name: payment.channel_name,
    });
  } catch (error: any) {
    ResponseApi.error(res, "Erreur paiement forfait", error.message);
    console.log('====================================');
    console.log(error);
    console.log('====================================');
  }
};

// Callback pour notifier le paiement (à appeler par Monetbil)
export const monetbilNotification = async (req: Request, res: Response) => {
  const { paymentId, item_ref } = req.body;
  try {
    const paymentStatus = await checkPayment(paymentId);
    if (
      paymentStatus.transaction &&
      paymentStatus.transaction.status === 1 // 1 = succès
    ) {
      // Activer le forfait sur le produit
      const productId = item_ref;
      const forfaitType = paymentStatus.transaction.item_ref; // ou récupère le type autrement
      const forfait = await prisma.forfait.findFirst({ where: { type: forfaitType } });
      if (forfait) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + forfait.duration * 24 * 60 * 60 * 1000);
        await prisma.productForfait.create({
          data: {
            productId,
            forfaitId: forfait.id,
            activatedAt: now,
            expiresAt,
            isActive: true,
          },
        });
      }
    }
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};