"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandling = exports.AppError = void 0;
class AppError extends Error {
    message;
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        ((this.message = message), (this.statusCode = statusCode));
    }
}
exports.AppError = AppError;
const globalErrorHandling = (err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
        message: err.message,
        status,
        stack: err.stack,
    });
};
exports.globalErrorHandling = globalErrorHandling;
