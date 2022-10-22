"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mac_json_1 = __importDefault(require("./mac.json"));
/**
* Cross references provided mac address with lookup table
* @param {String} mac
*
* @returns {String | undefined}
*/
exports.default = (function (mac) {
    var start = mac
        // Split on MAC separator (:)
        .split(':')
        // Get only the 3 first parts (vendor specific)
        .slice(0, 3)
        // Add leading 0 (if missing) and make it uppercase
        .map(function (part) {
        return (new Array(2 - part.length)
            .fill('0')
            .join('') +
            part).toUpperCase();
    })
        // Join them back together
        .join(':');
    return mac_json_1.default[start];
});
