"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOTP = exports.generateOTP = void 0;
const generateOTP = (length = 6) => {
    const digits = "0123456789";
    let OTP = "";
    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
};
exports.generateOTP = generateOTP;
const validateOTP = (inputOTP, storedOTP) => {
    if (!storedOTP)
        return false;
    return inputOTP === storedOTP;
};
exports.validateOTP = validateOTP;
