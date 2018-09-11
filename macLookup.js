'use strict';

const addresses = {
    "Apple": [
        "2:f:b5",
        "1c:36:bb",
        "8c:85:90",
        "8:66:98",
        "dc:2b:2a",
        "34:8:bc",
        "e0:ac:cb"
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
}

/**
* Cross references provided mac address with lookup table (incomplete)
* @param {string} mac
* @param {string} type
* @return {string}
*/

function macLookup(mac, type) {
    var leading = mac.split(':').slice(0, 3).join(':');
    
    if (type && addresses[type]) {
        if (addresses[type].indexOf(leading) > -1) return type;
    }
    
    if (JSON.stringify(addresses).indexOf(leading) == -1) return false;
    for (var vendor in addresses) {
        if (addresses[vendor].indexOf(leading) > -1) return vendor;
    }
}

module.exports = macLookup;