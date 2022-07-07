"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var addresses = {
    "Apple": [
        "2:f:b5",
        "1c:36:bb",
        "8c:85:90",
        "8:66:98",
        "dc:2b:2a",
        "34:8:bc",
        "e0:ac:cb",
        "dc:a9:04",
        "dc:a9:4"
    ],
    "RaspberryPi": [
        "b8:27:eb"
    ],
    "ParticlePhoton": [
        "e0:4f:43"
    ],
    "Sonos": [
        "94:9f:3e",
        "78:28:ca"
    ],
    "Netgear": [
        "a0:40:a0"
    ],
    "Roku": [
        "20:f5:43"
    ]
};
var stringAddresses = JSON.stringify(addresses);
/**
* Cross references provided mac address with lookup table (incomplete)
* @param {String} mac
* @param {String} type
*
* @returns {String}
*/
function macLookup(mac, type) {
    var leading = mac.split(':').slice(0, 3).join(':');
    if (type && addresses[type]) {
        if (addresses[type].includes(leading))
            return type;
    }
    if (!stringAddresses.includes(leading))
        return null;
    for (var vendor in addresses) {
        if (addresses[vendor].includes(leading))
            return vendor;
    }
    return null;
}
exports.default = macLookup;
