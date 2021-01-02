'use strict';

const os = require('os');
const { exec } = require('child_process');

const macLookup = require('./macLookup.js');

var flag;
const osType = os.type();

switch(osType) {
    case 'Windows_NT':
        flag = '-w';
        break;
    case 'Linux':
        flag = '-w';
        break;
    case 'Darwin':
        flag = '-t';
        break;
    default:
        throw new Error(`Unsupported OS: ${osType}`);
}

function Arpping({ internal = false, timeout = 5, includeEndpoints = false, useCache = true, cacheTimeout = 3600 } = {}) {
    if (timeout < 1 || timeout > 60) throw new Error(`Invalid timeout parameter: ${timeout}. Timeout should be between 1 and 60.`);
    this.timeout = parseInt(timeout) || timeout.toFixed(0);

    this.internal = internal;
    this.includeEndpoints = includeEndpoints;
    this.myIP = null;

    this.useCache = useCache;
    this.cache = [];
    this.cacheTimeout = cacheTimeout;
    this.cacheUpdate = 0;
}

/**
* Build array of full ip range (xxx.xxx.x.1-255) given example ip address
* @param {String} ip
*/
Arpping.prototype._getFullRange = function(ip) {
    // don't use default assignment so false-y values are overwritten
    ip = ip || this.myIP;
    const ipStart = ip.substr(0, ip.lastIndexOf('.') + 1);
    return this.includeEndpoints ? 
        Array.from({ length: 255 }, (_, i) => ipStart + (i + 1)):
        Array.from({ length: 253 }, (_, i) => ipStart + (i + 2));
}

/**
* Find ip and mac addresses of host device
*/
Arpping.prototype.findMyInfo = function() {
    return new Promise((resolve, reject) => {
        const interfaces = os.networkInterfaces();
        for (let interfaceArr of Object.values(interfaces)) {
            const connection = interfaceArr.find(i => i.internal === this.internal && i.family === 'IPv4');
            if (connection) {
                const { address: ip, mac } = connection;
                const type = macLookup(mac);
                this.myIP = ip;

                return resolve(type ? { ip, mac, type }: { ip, mac });
            }
        }
        return reject(new Error(`No internet connection found`));
    });
}

/**
* Discover all hosts connected to your local network or based on a reference IP address
* @param {String} refIP
* @param {Boolean} retry
*/
Arpping.prototype.discover = function(refIP, retry = true) {
    if (this.useCache && this.cache.length && Date.now() - this.cacheUpdate < this.cacheTimeout * 1000) {
        return new Promise(resolve => resolve(this.cache));
    }
    if (!refIP && !this.myIP) {
        if (retry) return this.findMyInfo().then(info => this.discover(info.ip, false));
        return new Promise((_, reject) => reject(new Error('Failed to find host IP address')));
    }

    const range = this._getFullRange(refIP);
    return this.ping(range)
        .then(({ hosts }) => this.arp(hosts))
        .then(({ hosts }) => {
            this.cache = hosts.slice(0);
            this.cacheUpdate = Date.now();
            return hosts;
        });
}

/**
* Ping a range of ip addresses
* @param {Array} range
*/
Arpping.prototype.ping = function(range) {
    if (!(Array.isArray(range) && range.length)) {
        if (!this.myIP) return this.findMyInfo().then(() => this.ping(range));
        range = this._getFullRange();
    }

    return new Promise(resolve => {
        const hosts = [],
            missing =[];
        let checked = 0;
        range.forEach(ip => {
            exec(`ping ${flag} ${this.timeout} ${ip}`, (err, stdout) => {
                checked++;
                if (err || stdout.includes('100% packet loss')) missing.push(ip);
                else hosts.push(ip);
                
                if (checked === range.length) resolve({ hosts, missing });
            });
        });
    });
}

/**
* Arp a range of ip addresses
* @param {Array} range
*/
Arpping.prototype.arp = function(range) {
    return new Promise((resolve, reject) => {
        if (typeof range === 'string') range = [ range ];
        else if (!Array.isArray(range)) return reject(new Error('range must be an array of IP addresses'));
        else if (!range.length) return resolve({ hosts: [], missing: [] });

        const hosts = [],
            missing = [];
        let checked = 0;
        range.forEach(ip => {
            exec(`arp ${ip}`, (err, stdout) => {
                checked++;
                if (err || stdout.includes('no entry')) missing.push(ip);
                else {
                    const mac = (osType === 'Linux') ? 
                        stdout.split('\n')[1].replace(/ +/g, ' ').split(' ')[2]: 
                        stdout.split(' ')[3];
                    if (mac.includes('incomplete')) missing.push(ip);
                    else {
                        const host = { ip, mac };
                        const type = macLookup(mac);
                        if (type) host.type = type;
                        if (ip === this.myIP) host.isHostDevice = true;
                        hosts.push(host);
                    }
                }
                
                if (checked === range.length) resolve({ hosts, missing });
            });
        });
    });
}

/**
* Search for one or multiple IP addresses
* @param {String/Array} ipArray
* @param {String} refIP
*/
Arpping.prototype.searchByIpAddress = function(ipArray, refIP) {
    if (typeof ipArray === 'string') ipArray = [ ipArray ];
    else if (!Array.isArray(ipArray) || !ipArray.length) {
        return new Promise((_, reject) => reject(new Error(`Invalid ipArray: ${ipArray}. Search input should be one ip address string or an array of ip strings.`)));
    }

    return this.discover(refIP || ipArray[0])
        .then(hosts => {
            // define outside of loop
            const hostIPs = hosts.map(h => h.ip);
            return {
                hosts: hosts.filter(h => ipArray.includes(h.ip)), 
                missing: ipArray.filter(ip => !hostIPs.includes(ip))
            }
        });
}

/**
* Search for one or multiple, full or partial mac addresses
* @param {String/Array} macArray
* @param {String} refIP
*/
Arpping.prototype.searchByMacAddress = function(macArray, refIP) {
    if (typeof macArray === 'string') macArray = [ macArray ];
    else if (!Array.isArray(macArray) || !macArray.length) {
        return new Promise((_, reject) => reject(`Invalid macArray: ${macArray}. Search input should be one mac address string or an array of mac address strings.`));
    }

    return this.discover(refIP)
        .then(hosts => {
            // define outside of loop
            const check = JSON.stringify(hosts);
            return {
                hosts: hosts.filter(h => {
                    h.matched = [];
                    for (let m of macArray) {
                        if (h.mac.toLowerCase().includes(m.toLowerCase())) h.matched.push(m);
                    }
                    return h.matched.length;
                }),
                missing: macArray.filter(m => !check.includes(m))
            }
        });
}

/**
* Search for devices with the designated mac address type
* @param {String} macType
* @param {String} refIP
*/
Arpping.prototype.searchByMacType = function(macType, refIP) {
    macType = macType.toLowerCase();
    return this.discover(refIP).then(hosts => hosts.filter(h => h.type && h.type.toLowerCase() === macType));
}

module.exports = Arpping;
