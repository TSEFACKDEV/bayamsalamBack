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
exports.createContact = void 0;
const mailer_js_1 = require("../utilities/mailer.js");
const config_js_1 = __importDefault(require("../config/config.js"));
const prisma_client_js_1 = __importDefault(require("../model/prisma.client.js"));
const response_js_1 = __importDefault(require("../helper/response.js"));
const createContactEmailTemplate_js_1 = require("../templates/createContactEmailTemplate.js"); // ← Ajout de l'import
const createContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Tous les champs sont requis.' });
        }
        const contact = yield prisma_client_js_1.default.contact.create({
            data: {
                name,
                email,
                subject,
                message,
            },
        });
        // Créer le template HTML stylisé pour l'admin
        const htmlTemplate = (0, createContactEmailTemplate_js_1.createContactEmailTemplate)(name, email, subject, message);
        // Envoi d'un email de notification stylisé à l'admin
        yield (0, mailer_js_1.sendEmail)(config_js_1.default.smtpUser || 'tsefackcalvinklein@gmail.com', // ← Correction: gmailUser au lieu de smtpUser
        `🔔 Nouveau message BuyAndSale : ${subject}`, `Nouveau message de ${name} (${email})\n\nSujet: ${subject}\n\nMessage: ${message}`, // Version texte de fallback
        htmlTemplate // Version HTML stylisée
        );
        response_js_1.default.success(res, 'Message envoyé avec succès.', contact, 201);
    }
    catch (error) {
        response_js_1.default.error(res, "Erreur lors de l'envoi du message.", error);
    }
});
exports.createContact = createContact;
