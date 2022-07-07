"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var os = require('os');
var Netmask = require('netmask').Netmask;
var execFile = require('child_process').execFile;
var macLookup_1 = __importDefault(require("./macLookup"));
var flag;
var osType = os.type();
var arpFlag = osType === 'Windows_NT' ? ['-a'] : [];
switch (osType) {
    case 'Windows_NT':
    case 'Linux':
        flag = '-w';
        break;
    case 'Darwin':
        flag = '-t';
        break;
    default:
        throw new Error("Unsupported OS: ".concat(osType));
}
var Arpping = /** @class */ (function () {
    /**
    * Filter network interfaces to find active internet connections
    * @param {object} [options = {}]
    * @param {number} [options.timeout = 3] - timeout in seconds for ping/arp scans
    * @param {boolean} [options.includeEndpoints = false] - whether endpoints (e.g. xxx.xxx.xxx.1,255) should be included in scans
    * @param {boolean} [options.useCache = true] - whether results from ping/arp scans should be cached for quicker use
    * @param {number} [options.cacheTimeout = 3600] - TTL in seconds for cache
    * @param {object} [options.interfaceFilters = {}] - filters for specifying which network interface to ping/arp (empty arrays accept all values)
    * @param {number} [options.connectionInterval = 600] - time interval (in seconds) for testing device's connection
    * @param {function[]} [options.onConnect = []] - array of callback functions to be called when a new connection is established
    * @param {function[]} [options.onDisconnect = []] - array of callback functions to be called when an existing connection is no longer active
    * @param {boolean} [options.debug = false] - toggle debug logging
    */
    function Arpping(_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.timeout, timeout = _c === void 0 ? 3 : _c, _d = _b.includeEndpoints, includeEndpoints = _d === void 0 ? false : _d, _e = _b.useCache, useCache = _e === void 0 ? true : _e, _f = _b.cacheTimeout, cacheTimeout = _f === void 0 ? 3600 : _f, _g = _b.interfaceFilters, interfaceFilters = _g === void 0 ? {} : _g, _h = _b.connectionInterval, connectionInterval = _h === void 0 ? 600 : _h, _j = _b.onConnect, onConnect = _j === void 0 ? [] : _j, _k = _b.onDisconnect, onDisconnect = _k === void 0 ? [] : _k, _l = _b.debug, debug = _l === void 0 ? false : _l;
        var _this = this;
        if (timeout < 1 || timeout > 60)
            throw new Error("Invalid timeout parameter: ".concat(timeout, ". Timeout should be between 1 and 60."));
        this.timeout = parseInt(timeout.toString());
        this.debug = debug;
        this.includeEndpoints = includeEndpoints;
        this.useCache = useCache;
        this.cache = [];
        this.cacheTimeout = cacheTimeout;
        this.cacheUpdate = 0;
        this.interfaceFilters = Object.assign({
            interface: ['lo0', 'en0', 'en1', 'wlan0'],
            internal: [false],
            family: ['IPv4']
        }, interfaceFilters);
        this.myDevice = { os: osType, connection: null };
        this.onConnect = onConnect;
        this.onDisconnect = onDisconnect;
        this.getConnection(this.interfaceFilters);
        if (connectionInterval)
            this.interval = setInterval(function () { return _this.getConnection(_this.interfaceFilters); }, connectionInterval * 1000);
    }
    /**
    * Static wrapper for `os` module's `networkInterfaces` function
    * @returns {object} list of available interfaces organized by interface name
    */
    Arpping.getNetworkInterfaces = function () {
        return os.networkInterfaces();
    };
    /**
    * Filter network interfaces to find active internet connections
    * @param {object} [interfaceFilters]
    * @param {string[]} [interfaceFilters.interface] - array of acceptable interface names
    * @param {boolean[]} [interfaceFilters.internal] - array specifying internal and/or external network status
    * @param {string[]} [interfaceFilters.family] - array specifying IPv4 and/or IPv6 (untested, probably unsupported)
    *
    * @returns {object | null}
    */
    Arpping.prototype.getConnection = function (_a) {
        var _this = this;
        var _b = _a === void 0 ? {} : _a, _c = _b.interface, interfaceName = _c === void 0 ? ['lo0', 'en0', 'eth0', 'wlan0'] : _c, _d = _b.internal, internal = _d === void 0 ? [false] : _d, _e = _b.family, family = _e === void 0 ? ['IPv4'] : _e;
        var wasConnected = !!this.myDevice.connection;
        var interfaces = Arpping.getNetworkInterfaces();
        for (var _i = 0, _f = Object.entries(interfaces); _i < _f.length; _i++) {
            var _g = _f[_i], name_1 = _g[0], arr = _g[1];
            if (interfaceName.length && !interfaceName.includes(name_1))
                continue;
            for (var _h = 0, arr_1 = arr; _h < arr_1.length; _h++) {
                var connection = arr_1[_h];
                if (internal.length && !internal.includes(connection.internal))
                    continue;
                if (family.length && !family.includes(connection.family))
                    continue;
                this.myDevice.connection = __assign({ name: name_1 }, connection);
                this.myDevice.type = (0, macLookup_1.default)(connection.mac);
                if (!wasConnected) {
                    if (this.debug)
                        console.log("Interface ".concat(name_1, " connected"));
                    this.onConnect.forEach(function (callback) { return callback(_this.myDevice.connection); });
                }
                return this.myDevice.connection;
            }
        }
        if (wasConnected) {
            if (this.debug)
                console.log("Interface ".concat(this.myDevice.connection.name, " disconnected"));
            this.onDisconnect.forEach(function (callback) { return callback(); });
        }
        this.myDevice.connection = null;
        return null;
    };
    /**
    * Build array of full ip range (xxx.xxx.x.1-255) host device's ip address
    * @param {number | string} [netmaskOverride] - optional number or string netmask value
    *
    * @returns {string[]}
    */
    Arpping.prototype._getFullRange = function (netmaskOverride) {
        if (!this.myDevice.connection) {
            if (this.debug)
                console.log("No connection available");
            return [];
        }
        var _a = this.myDevice.connection, address = _a.address, netmask = _a.netmask;
        var block = new Netmask(address, netmaskOverride || netmask);
        var range = [];
        if (this.includeEndpoints) {
            range.push(block.base);
            block.forEach(function (ip) { return range.push(ip); });
            range.push(block.broadcast);
        }
        else
            block.forEach(function (ip) { return range.push(ip); });
        return range;
    };
    /**
    * Ping a range of ip addresses
    * @param {string[]} [range] - array of ip addresses to ping, defaults to full netmask range
    *
    * @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
    */
    Arpping.prototype.ping = function (range) {
        return __awaiter(this, void 0, void 0, function () {
            var pings, results;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.myDevice.connection)
                            throw new Error('No connection!');
                        if (!range) {
                            range = this._getFullRange();
                            if (!range.length)
                                throw new Error('No connection!');
                        }
                        pings = range.map(function (ip) { return new Promise(function (resolve, reject) {
                            execFile('ping', [flag, _this.timeout, ip], function (err, stdout) {
                                if (err || stdout.match(/100(\.0)?% packet loss/g))
                                    return reject(ip);
                                return resolve(ip);
                            });
                        }); });
                        return [4 /*yield*/, Promise.allSettled(pings)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.reduce(function (ret, _a) {
                                var status = _a.status, _b = _a.value, value = _b === void 0 ? null : _b, _c = _a.reason, ip = _c === void 0 ? null : _c;
                                if (status === 'fulfilled')
                                    ret.hosts.push(value);
                                else
                                    ret.missing.push(ip);
                                return ret;
                            }, { hosts: [], missing: [] })];
                }
            });
        });
    };
    /**
    * Arp a range of ip addresses
    * @param {string[]} [range = []] - array of ip addresses to arp
    *
    * @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
    */
    Arpping.prototype.arp = function (range) {
        if (range === void 0) { range = []; }
        return __awaiter(this, void 0, void 0, function () {
            var arps, results;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.myDevice.connection)
                            throw new Error('No connection!');
                        arps = range.map(function (ip) { return new Promise(function (resolve, reject) {
                            execFile('arp', __spreadArray(__spreadArray([], arpFlag, true), [ip], false), function (err, stdout) {
                                if (err || stdout.includes('no entry') || stdout.includes('(incomplete)'))
                                    return reject(ip);
                                var _a = (stdout.match(/([0-9A-Fa-f]{1,2}[:-]){5}([0-9A-Fa-f]{1,2})/ig) || [])[0], mac = _a === void 0 ? null : _a;
                                if (!mac)
                                    return reject(ip);
                                var host = { ip: ip, mac: mac, type: (0, macLookup_1.default)(mac) };
                                if (ip === _this.myDevice.connection.address)
                                    host.isHostDevice = true;
                                execFile('nslookup', [ip], function (err, stdout) {
                                    if (!err) {
                                        var _a = (stdout.match(/ = .*/) || [])[0], name_2 = _a === void 0 ? null : _a;
                                        if (!!name_2)
                                            host.name = name_2.substr(3, name_2.length - 4);
                                    }
                                    resolve(host);
                                });
                            });
                        }); });
                        return [4 /*yield*/, Promise.allSettled(arps)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.reduce(function (ret, _a) {
                                var status = _a.status, _b = _a.value, value = _b === void 0 ? null : _b, _c = _a.reason, ip = _c === void 0 ? null : _c;
                                if (status === 'fulfilled')
                                    ret.hosts.push(value);
                                else
                                    ret.missing.push(ip);
                                return ret;
                            }, { hosts: [], missing: [] })];
                }
            });
        });
    };
    /**
    * Discover all hosts connected to your local network or based on a reference IP address
    * @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
    *
    * @returns {Promise<object[]>} Promise returns an array of discovered host objects
    */
    Arpping.prototype.discover = function (range) {
        return __awaiter(this, void 0, void 0, function () {
            var hosts;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.useCache && this.cache.length && Date.now() - this.cacheUpdate < this.cacheTimeout * 1000) {
                            return [2 /*return*/, range
                                    ? this.cache.filter(function (_a) {
                                        var ip = _a.ip;
                                        return range.includes(ip);
                                    })
                                    : this.cache];
                        }
                        return [4 /*yield*/, this.ping(range).then(function (_a) {
                                var hosts = _a.hosts;
                                return _this.arp(hosts);
                            })];
                    case 1:
                        hosts = (_a.sent()).hosts;
                        this.cache = hosts.slice(0);
                        this.cacheUpdate = Date.now();
                        return [2 /*return*/, hosts];
                }
            });
        });
    };
    /**
    * Search for one or multiple IP addresses
    * @param {string[]} ipArray - array of ip addresses to search
    *
    * @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
    */
    Arpping.prototype.searchByIpAddress = function (ipArray) {
        return __awaiter(this, void 0, void 0, function () {
            var hosts, hostIPs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!Array.isArray(ipArray) || !ipArray.length) {
                            throw new Error("Invalid ipArray: ".concat(ipArray, ". Search input should be an array of one or more ip strings."));
                        }
                        return [4 /*yield*/, this.discover()];
                    case 1:
                        hosts = _a.sent();
                        hostIPs = hosts.map(function (h) { return h.ip; });
                        return [2 /*return*/, {
                                hosts: hosts.filter(function (h) { return ipArray.includes(h.ip); }),
                                missing: ipArray.filter(function (ip) { return !hostIPs.includes(ip); })
                            }];
                }
            });
        });
    };
    /**
    * Search for one or multiple, full or partial mac addresses
    * @param {string[]} macArray - array of full or partial mac addresses to search
    * @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
    *
    * @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
    */
    Arpping.prototype.searchByMacAddress = function (macArray, range) {
        return __awaiter(this, void 0, void 0, function () {
            var hosts, check;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!Array.isArray(macArray) || !macArray.length) {
                            throw new Error("Invalid macArray: ".concat(macArray, ". Search input should be an array of one or more mac address strings."));
                        }
                        return [4 /*yield*/, this.discover(range)];
                    case 1:
                        hosts = _a.sent();
                        check = JSON.stringify(hosts);
                        return [2 /*return*/, {
                                hosts: hosts.filter(function (h) {
                                    h.matched = [];
                                    for (var _i = 0, macArray_1 = macArray; _i < macArray_1.length; _i++) {
                                        var m = macArray_1[_i];
                                        if (h.mac.toLowerCase().includes(m.toLowerCase()))
                                            h.matched.push(m);
                                    }
                                    return h.matched.length;
                                }),
                                missing: macArray.filter(function (m) { return !check.includes(m); })
                            }];
                }
            });
        });
    };
    /**
    * Search for devices with the designated mac address type
    * @param {String} macType - mac type to search
    * @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
    *
    * @returns {Promise<object[]>} Promise returns an array of hosts with a matching mac type
    */
    Arpping.prototype.searchByMacType = function (macType, range) {
        return __awaiter(this, void 0, void 0, function () {
            var hosts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        macType = macType.toLowerCase();
                        return [4 /*yield*/, this.discover(range)];
                    case 1:
                        hosts = _a.sent();
                        return [2 /*return*/, hosts.filter(function (h) { return h.type && h.type.toLowerCase() === macType; })];
                }
            });
        });
    };
    Arpping.osType = osType;
    return Arpping;
}());
module.exports = Arpping;
exports.default = Arpping;
