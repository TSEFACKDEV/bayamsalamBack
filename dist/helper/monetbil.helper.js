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
exports.placePayment = placePayment;
exports.checkPayment = checkPayment;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config/config"));
const MONETBIL_SERVICE_KEY = config_1.default.MONETBIL_SERVICE_KEY || "7twIVmf2R0B9IBOHr0qWVAQ6yS5ws9gW";
const MONETBIL_BASE_URL = config_1.default.MONETBIL_BASE_URL || "https://api.monetbil.com/payment/v1";
function placePayment(_a) {
    return __awaiter(this, arguments, void 0, function* ({ phonenumber, amount, notify_url, country = "CM", currency = "XAF", operator = "CM_MTNMOBILEMONEY", // ou CM_ORANGEMONEY selon le choix
    item_ref, payment_ref, first_name, last_name, email, }) {
        const payload = {
            service: MONETBIL_SERVICE_KEY,
            phonenumber,
            amount,
            notify_url,
            country,
            currency,
            operator,
            item_ref,
            payment_ref,
            first_name,
            last_name,
            email,
        };
        const { data } = yield axios_1.default.post(`${MONETBIL_BASE_URL}/placePayment`, payload);
        return data;
    });
}
function checkPayment(paymentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const payload = { paymentId };
        const { data } = yield axios_1.default.post(`${MONETBIL_BASE_URL}/checkPayment`, payload);
        return data;
    });
}
