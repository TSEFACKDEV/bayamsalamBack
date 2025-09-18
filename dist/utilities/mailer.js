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
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_js_1 = __importDefault(require("../config/config.js"));
const transporter = nodemailer_1.default.createTransport({
    host: config_js_1.default.smtpHost,
    port: parseInt(config_js_1.default.smtpPort),
    secure: false, // true for 465, false for other ports
    auth: {
        user: config_js_1.default.smtpUser,
        pass: config_js_1.default.smtpPass,
    },
});
const sendEmail = (to, subject, text, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield transporter.sendMail({
            from: `"${config_js_1.default.fromName}" <${config_js_1.default.fromEmail}>`,
            to,
            subject,
            text,
            html: html || text,
        });
        return true;
    }
    catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
});
exports.sendEmail = sendEmail;
