"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORT = exports.NODE_ENV = void 0;
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
exports.NODE_ENV = process.env.NODE_ENV;
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(__dirname, `../../${exports.NODE_ENV}.env`) });
exports.PORT = Number(process.env.PORT) || 7000;
