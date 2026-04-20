"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const config_service_1 = require("./config/config.service");
const global_error_handling_1 = require("./common/utils/global-error-handling");
const app = (0, express_1.default)();
const bootstrap = () => {
    const limiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: 5 * 60 * 100,
        limit: 100,
    });
    app.use(express_1.default.json());
    app.use((0, cors_1.default)(), (0, helmet_1.default)(), limiter);
    app.get("/", (req, res, next) => res.status(200).json({
        message: "Welcome To Social App 🥳🥳",
    }));
    app.get("{/*demo}", (req, res, next) => {
        throw new global_error_handling_1.AppError(`The URL : ${req.originalUrl} with method:${req.method} Is Not Found 😔`, 404);
    });
    app.listen(config_service_1.PORT, () => console.log(`Social app listening on PORT ${config_service_1.PORT}!`));
};
exports.default = bootstrap;
