"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
const winston = __importStar(require("winston"));
const logger = new winston.Logger();
logger.add(winston.transports.Console, {
    colorize: true,
    level: "info",
    timestamp: true,
});
module.exports = logger;
