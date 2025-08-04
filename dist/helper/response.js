"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ResponseApi {
    static success(res, message, data, statusCode = 200) {
        return res.status(statusCode).json({
            meta: {
                status: statusCode,
                message: message,
            },
            data: data,
        });
    }
    static error(res, message, error, statusCode = 500) {
        return res.status(statusCode).json({
            meta: {
                status: statusCode,
                message: message,
            },
            error: error,
        });
    }
    static notFound(res, message = "Not Found", statusCode = 404) {
        return res.status(statusCode).json({
            meta: {
                status: statusCode,
                message: message,
            },
        });
    }
}
exports.default = ResponseApi;
