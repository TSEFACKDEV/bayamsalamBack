import { Request, Response } from "express";

import { sendEmail } from "../utilities/mailer.js";
import env from "../config/config.js";
import prisma from "../model/prisma.client.js";
import ResponseApi from "../helper/response.js";
import { createContactEmailTemplate } from "../templates/createContactEmailTemplate.js"; // ← Ajout de l'import

export const createContact = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    // Créer le template HTML stylisé pour l'admin
    const htmlTemplate = createContactEmailTemplate(
      name,
      email,
      subject,
      message
    );

    // Envoi d'un email de notification stylisé à l'admin
    await sendEmail(
      env.smtpUser || "tsefackcalvinklein@gmail.com", // ← Correction: gmailUser au lieu de smtpUser
      `🔔 Nouveau message BuyamSale : ${subject}`,
      `Nouveau message de ${name} (${email})\n\nSujet: ${subject}\n\nMessage: ${message}`, // Version texte de fallback
      htmlTemplate // Version HTML stylisée
    );

    ResponseApi.success(res, "Message envoyé avec succès.", contact, 201);
  } catch (error) {
    ResponseApi.error(res, "Erreur lors de l'envoi du message.", error);
    console.log("====================================");
    console.log("Error in createContact:", error);
    console.log("====================================");
  }
};
