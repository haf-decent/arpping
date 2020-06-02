'use strict';

const os = require('os');
const { exec } = require('child_process');

const macLookup = require('./macLookup.js');

var flag,
    ipCommand,
    osType = os.type();

switch(osType) {
    case 'Windows_NT':
        flag = '-w';
        ipCommand = 'ipconfig';
        break;
    case 'Linux':
        flag = '-w';
        ipCommand = 'ifconfig';
        break;
    case 'Darwin':
        flag = '-t';
        ipCommand = 'ifconfig';
        break;
    default:
        throw new Error('Unsupported OS: ' + osType);
}

function Arpping({ timeout = 5, includeEndpoints = false, useCache = true, cacheTimeout = 3600 }) {
    if (timeout < 1 || timeout > 60) throw new Error(`Invalid timeout parameter: ${timeout}. Timeout should be between 1 and 60.`);
    this.timeout = parseInt(timeout) || timeout.toFixed(0);

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
    ip = ip || this.myIP;
    var ipStart = ip.substr(0, ip.lastIndexOf('.') + 1);
    return this.includeEndpoints ? 
        Array.from({ length: 255 }, (_, i) => ipStart + (i + 1)):
        Array.from({ length: 253 }, (_, i) => ipStart + (i + 2));
}

/**
* Find ip and mac addresses of host device
* @param {Function} callback
*/
Arpping.prototype.findMyInfo = function(callback) {
    exec(ipCommand, (err, stdout, stderr) => {
        if (err) return callback(err);

        var output = null;
        if (osType == 'Linux') {
            if (stdout.indexOf('wlan0') == -1) return callback(new Error('No wifi connection'));
            output = stdout.split('wlan0')[1];
        }
        else {
            output = stdout.slice(stdout.indexOf('en0'));
            output = output.slice(0, output.indexOf('active\n')) + 'active';
            if (output.split('status: ')[1] == 'inactive') return callback(new Error('No wifi connection'));
        }
        var ip = output.slice(output.indexOf('inet ') + 5, output.indexOf(' netmask')).trim();
        var mac = output.slice(output.indexOf('ether ')).split('\n')[0].split(' ')[1].trim();
        var type = macLookup(mac);

        this.myIP = ip;
        callback(null, type ? { ip, mac }: { ip, mac, type });
    });
}

/**
* Discover all hosts connected to your local network or based on a reference IP address
* @param {String} refIP
* @param {Function} callback
* @param {Boolean} retry
*/
Arpping.prototype.discover = function(refIP, callback, retry = true) {
    if (this.useCache && this.cache.length && Date.now() - this.cacheUpdate < this.cacheTimeout * 1000) return callback(null, this.cache);
    if (!refIP && !this.myIP) {
        if (retry) return this.findMyInfo((err, info) => {
            if (err) return callback(err);
            this.discover(info.ip, callback, false);
        });
        return callback(new Error('Failed to find host IP address'));
    }

    var range = this._getFullRange(refIP || this.myIP);
    this.ping(range, (err1, hosts) => {
        if (err1) return callback(err);
        if (!hosts.length) return callback(null, []);
        this.arp(hosts, (err2, hosts) => {
            if (err2) return callback(err2);
            this.cache = hosts.slice(0);
            this.cacheUpdate = Date.now();
            callback(null, hosts);
        });
    });
}

/**
* Ping a range of ip addresses
* @param {Array} range
* @param {Function} callback
*/
Arpping.prototype.ping = function(range, callback) {
    if (!(Array.isArray(range) && range.length)) {
        if (!this.myIP) return this.findMyInfo(() => this.ping(range, callback));
        range = this._getFullRange();
    }
    var found = [],
        missing =[],
        checked = 0;
    range.forEach(ip => {
        exec(`ping ${flag} ${this.timeout} ${ip}`, (err, stdout, stderr) => {
            checked++;
            if (err || stdout.indexOf('100% packet loss') > -1) missing.push(ip);
            else found.push(ip);
            
            if (checked == range.length) callback(null, found, missing);
        });
    });
}

/**
* Arp a range of ip addresses
* @param {Array} range
* @param {Function} callback
*/
Arpping.prototype.arp = function(range, callback) {
    if (typeof range == 'string') range = [ range ];
    else if (!Array.isArray(range)) return callback(new Error('range must be an array of IP addresses'));
    else if (!range.length) return callback(new Error('range must not be empty'));
    
    var hosts = [],
        missing = [],
        checked = 0;
    range.forEach(ip => {
        exec(`arp ${ip}`, (err, stdout, stderr) => {
            checked++;
            if (err || stdout.indexOf('no entry') > -1) missing.push(ip);
            else {
                var mac = (osType == 'Linux') ? 
                    stdout.split('\n')[1].replace(/ +/g, ' ').split(' ')[2]: 
                    stdout.split(' ')[3];
                var host = { ip, mac };
                var type = macLookup(mac);
                if (type) host.type = type;
                if (ip == this.myIP) host.isHostDevice = true;
                hosts.push(host);
            }
            
            if (checked == range.length) callback(null, hosts, missing);
        });
    });
}

/**
* Search for one or multiple IP addresses
* @param {String/Array} ipArray
* @param {String} refIP
* @param {Function} callback
*/
Arpping.prototype.searchByIpAddress = function(ipArray, refIP, callback) {
    if (typeof ipArray === 'string') ipArray = [ ipArray ];
    else if (!Array.isArray(ipArray) || !ipArray.length) {
        return callback(new Error(`Invalid ipArray: ${ipArray}. Search input should be one ip address string or an array of ip strings.`));
    }
    
    this.discover(refIP || ipArray[0], (err, hosts) => {
        if (err) return callback(err);
        var hostIps = hosts.map(h => h.ip);
        callback(
            null, 
            hosts.filter(h => ipArray.includes(h.ip)), 
            ipArray.filter(ip => !hostIps.includes(ip))
        );
    });
}

/**
* Search for one or multiple, full or partial mac addresses
* @param {String/Array} macArray
* @param {String} refIP
* @param {Function} callback
*/
Arpping.prototype.searchByMacAddress = function(macArray, refIP, callback) {
    if (typeof macArray == 'string') macArray = [ macArray ];
    else if (!Array.isArray(macArray) || !macArray.length) {
        throw new Error(`Invalid macArray: ${macArray}. Search input should be one mac address string or an array of mac address strings.`);
    }
    
    this.discover(refIP, (err, hosts) => {
        if (err) return callback(err);
        var check = JSON.stringify(hosts);
        callback(
            null,
            hosts.filter(h => {
                h.matched = [];
                for (var m of macArray) if (h.mac.indexOf(m) > -1) h.matched.push(m);
                return h.matched.length;
            }),
            macArray.filter(m => check.indexOf(m) == -1)
        );
    });
}

/**
* Search for devices with the designated mac address type
* @param {String} macType
* @param {String} refIP
* @param {Function} callback
*/
Arpping.prototype.searchByMacType = function(macType, refIP, callback) {
    this.discover(refIP, (err, hosts) => {
        if (err) return callback(err);
        callback(null, hosts.filter(h => h.type == macType));
    });
}

module.exports = Arpping;