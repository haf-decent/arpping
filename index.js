'use strict';

const os = require('os');
const {exec} = require('child_process');

const macLookup = require('./macLookup.js');

var flag,
    timeout, 
    osType = os.type();

if (osType == "Linux" || osType == "Windows_NT") flag = '-w';
else if (osType == "Darwin") flag = '-t';
else throw new Error('Unsupported OS: ' + osType);


/**
* Ping a range of ip addresses
* @param {Array} range
* @param {Function} callback
*/
function pingDevices(range, callback) {
    if (!Array.isArray(range)) {
        if (!myIP) return arpping.findMyInfo(() => pingDevices(range, callback));
        var ipStart = myIP.substr(0, myIP.lastIndexOf('.') + 1);
        range = Array.from({length: 253}, (el, i) => ipStart + (i + 2));
    }
    
    var found = [],
        missing =[],
        checked = 0;
    
    var args = ['ping', flag, timeout];
    range.forEach((ip) => {
        args[3] = ip;
        exec(args.join(' '), (err, stdout, stderr) => {
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
function arpDevices(range, callback) {
    if (!Array.isArray(range)) return callback(new Error('range must be an array of IP addresses'));
    if (!range.length) return callback(new Error('range must not be empty'));
    
    var hosts = [],
        missing = [],
        checked = 0;
    
    range.forEach(function(ip) {
        exec('arp ' + ip, (err, stdout, stderr) => {
            checked++;
            if (err || stdout.indexOf('no entry') > -1) missing.push(ip);
            else {
                var host = {};
                host.ip = ip;
                host.mac = (osType == "Linux") ? stdout.split('\n')[1].replace(/ +/g, ' ').split(' ')[2]: stdout.split(' ')[3];
                var known = macLookup(host.mac);
                if (known) host.type = known;
                if (ip == myIP) host.isYourDevice = true;
                hosts.push(host);
            }
            
            if (checked == range.length) callback(null, hosts, missing);
        });
    });
}

var retry = false,
    myIP = null;
var arpping = {
    findMyInfo: function(callback) {
        exec('ifconfig', (err, stdout, stderr) => {
            if (err) {
                console.log(err);
                return callback(err);
            }
            if (osType == "Linux") {
                if (stdout.indexOf("wlan0") == -1) return callback(new Error('No wifi connection'));
                var wlan0 = stdout.split("wlan0")[1].split('\n');
                var ip = wlan0[1].slice(wlan0[1].indexOf('inet ')).split(' ')[1];
                var mac = wlan0[3].slice(wlan0[3].indexOf('ether ')).split(' ')[1];
            }
            else {
                var en0 = stdout.slice(stdout.indexOf('en0'), stdout.indexOf('en1')).split('\n\t');
                if (en0[4].indexOf('status: inactive') > -1) return callback(new Error('No wifi connection'));
                var ip = en0[3].split(' ')[1];
                var mac = en0[1].split(' ')[1];
            }

            myIP = ip;
            callback(null, {ip: ip, mac: mac});
        });
    },
    discover: function(callback) {
        if (!myIP) {
            if (retry) {
                retry = false;
                return callback(new Error('Failed to find your IP address'));
            }
            arpping.findMyInfo((err, info) => {
                if (err) return callback(err);
                retry = true;
                arpping.discover(callback);
            });
            return;
        }
        
        retry = false;
        pingDevices(null, (err, range) => {
            if (err) return callback(err);
            arpDevices(range, (error, hosts) => {
                if (error) return callback(error);
                callback(null, hosts);
            });
        });
    },
    search: {
        byIpAddress: function(ipArray, callback) {
            if (typeof ipArray == "string") ipArray = [ipArray];
            else if (!Array.isArray(ipArray) || !ipArray.length) throw new Error("Invalid ipArray. Search input should be one ip address string or an array of ip strings.");
            
            arpping.discover((err, hosts) => {
                if (err) return callback(err);
                var check = JSON.stringify(hosts);
                callback(
                    null,
                    hosts.filter(h => ipArray.indexOf(h.ip) > -1),
                    ipArray.filter(ip => check.indexOf(ip) == -1)
                );
            });
        },
        byMacAddress: function(macArray, callback) {
            if (typeof macArray == "string") macArray = [macArray];
            else if (!Array.isArray(macArray) || !macArray.length) throw new Error("Invalid macArray. Search input should be one mac address string or an array of mac address strings.");
            
            arpping.discover((err, hosts) => {
                if (err) return callback(err);
                var check = JSON.stringify(hosts);
                callback(
                    null,
                    hosts.filter((h) => {
                        //Mac addresses can be partial, so filtering must be done this way
                        for (var m of macArray) if (h.mac.indexOf(m) > -1) return true;
                        return false;
                    }),
                    macArray.filter(m => check.indexOf(m) == -1)
                );
            })
        },
        byMacType: function(macType, callback) {
            arpping.discover((err, hosts) => {
                if (err) return callback(err);
                callback(null, hosts.filter(h => h.type == macType));
            });
        }
    },
    ping: pingDevices,
    arp: arpDevices
}


/**
* Initialize arpping with a timeout for ping commands
* @param {Number} t
*/
module.exports = function(t) {
    if (!t) timeout = 10;
    else if (t < 1 || t > 60) throw new Error('Invalid timeout: ' + t + '\nPlease choose a timeout between 1 and 60 seconds');
    else timeout = parseInt(t) || t.toFixed(0);
    
    return arpping;
};