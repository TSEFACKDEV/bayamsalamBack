var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { sendEmail } from '../utilities/mailer.js';
import env from '../config/config.js';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';
export const createContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Tous les champs sont requis.' });
        }
        const contact = yield prisma.contact.create({
            data: {
                name,
                email,
                subject,
                message,
            },
        });
        // Envoi d'un email de notification (adapter selon votre mailer)
        yield sendEmail(env.smtpUser || 'tsefackcalvinklein@gmail.com', `Nouveau message de Bayamasalam : ${subject}`, `Nom: ${name}\nEmail: ${email}\nMessage: ${message}`);
        ResponseApi.success(res, 'Message envoyé avec succès.', contact, 201);
    }
    catch (error) {
        ResponseApi.error(res, 'Erreur lors de l\'envoi du message.', error);
        console.log('====================================');
        console.log('Error in createContact:', error);
        console.log('====================================');
    }
});
