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
exports.getSmsBalance = exports.sendSMS = void 0;
const axios_1 = __importDefault(require("axios"));
const config_js_1 = __importDefault(require("../config/config.js"));
const sendSMS = (phone, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Format phone number (add 237 if not present)
        let formattedPhone = phone;
        if (!formattedPhone.startsWith('237')) {
            formattedPhone = `237${formattedPhone}`;
        }
        const url = 'https://smsvas.com/bulk/public/index.php/api/v1/sendsms';
        const params = new URLSearchParams();
        params.append('user', config_js_1.default.nexahUser);
        params.append('password', config_js_1.default.nexahPassword);
        params.append('senderid', config_js_1.default.nexahSenderId);
        params.append('sms', message);
        params.append('mobiles', formattedPhone);
        const response = yield axios_1.default.get(`${url}?${params.toString()}`);
        if (response.data.responsecode === 1) {
            return true;
        }
        else {
            console.error('SMS sending failed:', response.data.responsemessage);
            return false;
        }
    }
    catch (error) {
        console.error('Error sending SMS:', error);
        return false;
    }
});
exports.sendSMS = sendSMS;
const getSmsBalance = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = 'https://smsvas.com/bulk/public/index.php/api/v1/smscredit';
        const params = new URLSearchParams();
        params.append('user', config_js_1.default.nexahUser);
        params.append('password', config_js_1.default.nexahPassword);
        const response = yield axios_1.default.get(`${url}?${params.toString()}`);
        return response.data.credit;
    }
    catch (error) {
        console.error('Error getting SMS balance:', error);
        return null;
    }
});
exports.getSmsBalance = getSmsBalance;
