import { Request, Response } from 'express';

import { sendEmail } from '../utilities/mailer.js';
import env from '../config/config.js';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';





export const createContact = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, subject, message} = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    // Envoi d'un email de notification (adapter selon votre mailer)
    await sendEmail(
      env.smtpUser || 'tsefackcalvinklein@gmail.com',
      `Nouveau message de Bayamasalam : ${subject}`,
      `Nom: ${name}\nEmail: ${email}\nMessage: ${message}`
    );

    ResponseApi.success(res, 'Message envoyé avec succès.', contact, 201);
  } catch (error) {
    ResponseApi.error(res, 'Erreur lors de l\'envoi du message.', error);
    console.log('====================================');
    console.log('Error in createContact:', error);
    console.log('====================================');
  }
};