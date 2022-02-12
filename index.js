const os = require('os');
const { Netmask } = require('netmask');
const { execFile } = require('child_process');

const macLookup = require('./macLookup.js');

let flag;
const osType = os.type();
const arpFlag = osType === 'Windows_NT' ? [ '-a' ]: [];
switch (osType) {
	case 'Windows_NT':
	case 'Linux':
		flag = '-w';
		break;
	case 'Darwin':
		flag = '-t';
		break;
	default:
		throw new Error(`Unsupported OS: ${osType}`);
}

/**
* Filter network interfaces to find active internet connections
* @param {Object} options
* @param {Number} options.timeout - timeout in seconds for ping/arp scans
* @param {Boolean} options.includeEndpoints - timeout in seconds for ping/arp scans
* @param {Boolean} options.useCache - whether results from ping/arp scans should be cached for quicker use
* @param {Number} options.cacheTimeout - TTL in milliseconds for cache
* @param {Object} options.interfaceFilters - filters for specifying which network interface to ping/arp (empty arrays accept all values)
* @param {Array} options.interfaceFilters.interface - acceptable interface names (e.g. lo0, en1, wlan0, etc.)
* @param {Array} options.interfaceFilters.internal - whether network can be internal (hosted by the device running this program) or external
* @param {Array} options.interfaceFilters.family - IPv4 and/or IPv6 designation
* @param {Number} options.connectionInterval - time interval (in seconds) for testing device's connection
* @param {Array} options.onConnect - array of callback functions to be called when a new connection is established
* @param {Array} options.onDisconnect - array of callback functions to be called when an existing connection is no longer active
* @param {Array} options.debug - toggle debug logging
* 
* @returns {Object} Arpping object
*/
function Arpping({
	timeout = 3,
	includeEndpoints = false,
	useCache = true,
	cacheTimeout = 3600,
	interfaceFilters = {},
	connectionInterval = 600,
	onConnect = [],
	onDisconnect = [],
	debug = false
} = {}) {
	if (timeout < 1 || timeout > 60) throw new Error(`Invalid timeout parameter: ${timeout}. Timeout should be between 1 and 60.`);
	this.timeout = parseInt(timeout) || timeout.toFixed(0);
	this.debug = debug;

	this.includeEndpoints = includeEndpoints;

	this.useCache = useCache;
	this.cache = [];
	this.cacheTimeout = cacheTimeout;
	this.cacheUpdate = 0;

	this.interfaceFilters = Object.assign({
		interface: [ 'lo0', 'en0', 'en1', 'wlan0' ],
		internal: [ false ],
		family: [ 'IPv4' ]
	}, interfaceFilters);
	this.myDevice = { os: osType, connection: null };

	this.onConnect = onConnect;
	this.onDisconnect = onDisconnect;
	this.getConnection(this.interfaceFilters);
	if (connectionInterval) this.interval = setInterval(() => this.getConnection(this.interfaceFilters), connectionInterval * 1000);
}

/**
* Static wrapper for `os` module's `networkInterfaces` function
* @returns {Object} list of available interfaces organized by interface name
*/
Arpping.getNetworkInterfaces = function() {
	return os.networkInterfaces();
}

/**
* Filter network interfaces to find active internet connections
* @param {Object} interfaceFilters
* 
* @returns {Object|null}
*/
Arpping.prototype.getConnection = function({
	interface: interfaceName = [ 'lo0', 'en0', 'eth0', 'wlan0' ],
	internal = [ false ],
	family = [ 'IPv4' ]
} = {}) {
	const wasConnected = !!this.myDevice.connection;
	const interfaces = Arpping.getNetworkInterfaces();
	for (const [ name, arr ] of Object.entries(interfaces)) {
		if (interfaceName.length && !interfaceName.includes(name)) continue;
		for (const connection of arr) {
			if (internal.length && !internal.includes(connection.internal)) continue;
			if (family.length && !family.includes(connection.family)) continue;
			this.myDevice.connection = { name, ...connection };
			this.myDevice.type = macLookup(connection.mac);
			if (!wasConnected) {
				if (this.debug) console.log(`Interface ${name} connected`);
				this.onConnect.forEach(callback => callback(this.myDevice.connection));
			}
			return this.myDevice.connection;
		}
	}
	if (wasConnected) {
		if (this.debug) console.log(`Interface ${this.myDevice.connection.name} disconnected`);
		this.onDisconnect.forEach(callback => callback());
	}
	this.myDevice.connection = null;
	return null;
}

/**
* Build array of full ip range (xxx.xxx.x.1-255) given example ip address
* @returns {Array}
*/
Arpping.prototype._getFullRange = function(netmaskOverride = null) {
	if (!this.myDevice.connection) {
		if (this.debug) console.log(`No connection available`);
		return [];
	}
	const { connection: { address, netmask } } = this.myDevice;
	const block = new Netmask(address, netmaskOverride || netmask);
	const range = [];
	if (this.includeEndpoints) {
		range.push(block.base);
		block.forEach(ip => range.push(ip));
		range.push(block.broadcast);
	}
	else block.forEach(ip => range.push(ip));

	return range;
}

/**
* Discover all hosts connected to your local network or based on a reference IP address
* @returns {Promise} Promise object returns an array of discovered hosts
*/
Arpping.prototype.discover = async function(range) {
	if (this.useCache && this.cache.length && Date.now() - this.cacheUpdate < this.cacheTimeout * 1000) {
		return range 
			? this.cache.filter(({ ip }) => range.includes(ip))
			: this.cache;
	}

	const { hosts } = await this.ping(range).then(({ hosts }) => this.arp(hosts));
	this.cache = hosts.slice(0);
	this.cacheUpdate = Date.now();
	return hosts;
}

/**
* Ping a range of ip addresses
* @param {Array} range - array of ip addresses to ping
* 
* @returns {Promise} Promise object returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
*/
Arpping.prototype.ping = async function(range) {
	if (!this.myDevice.connection) throw new Error('No connection!');
	if (!range) {
		range = this._getFullRange();
		if (!range.length) throw new Error('No connection!');
	}

	const pings = range.map(ip => new Promise((resolve, reject) => {
		execFile('ping', [ flag, this.timeout, ip ], (err, stdout) => {
			if (err || stdout.match(/100(\.0)?% packet loss/g)) return reject(ip);
			return resolve(ip);
		});
	}));
	const results = await Promise.allSettled(pings);
	return results.reduce((ret, { status, value = null, reason: ip = null }) => {
		if (status === 'fulfilled') ret.hosts.push(value);
		else ret.missing.push(ip);
		return ret;
	}, { hosts: [], missing: [] });
}

/**
* Arp a range of ip addresses
* @param {Array} range - array of ip addresses to arp
* 
* @returns {Promise} Promise object returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
*/
Arpping.prototype.arp = async function(range = []) {
	if (!this.myDevice.connection) throw new Error('No connection!');

	const arps = range.map(ip => new Promise((resolve, reject) => {
		execFile('arp', [ ...arpFlag, ip ], (err, stdout) => {
			if (err || stdout.includes('no entry') || stdout.includes('(incomplete)')) return reject(ip);

			const [ mac = null ] = stdout.match(/([0-9A-Fa-f]{1,2}[:-]){5}([0-9A-Fa-f]{1,2})/ig) || [];
			if (!mac) return reject(ip);
			const host = { ip, mac, type: macLookup(mac) };
			if (ip === this.myDevice.connection.address) host.isHostDevice = true;
			execFile('nslookup', [ ip ], (err, stdout) => {
				if (!err) {
					const [ name = null ] = stdout.match(/ = .*/) || [];
					if (!!name) host.name = name.substr(3, name.length - 4);
				}
				resolve(host);
			});
		});
	}));
	const results = await Promise.allSettled(arps);
	return results.reduce((ret, { status, value = null, reason: ip = null }) => {
		if (status === 'fulfilled') ret.hosts.push(value);
		else ret.missing.push(ip);
		return ret;
	}, { hosts: [], missing: [] });
}

/**
* Search for one or multiple IP addresses
* @param {String/Array} ipArray - array of ip addresses to search
* 
* @returns {Promise} Promise object returns and object of responsive hosts (hosts) and unresponsive ip addresses (missing)
*/
Arpping.prototype.searchByIpAddress = async function(ipArray) {
	if (!Array.isArray(ipArray) || !ipArray.length) {
		throw new Error(`Invalid ipArray: ${ipArray}. Search input should be an array of one or more ip strings.`);
	}

	const hosts = await this.discover();
	// define outside of loop
	const hostIPs = hosts.map(h => h.ip);
	return {
		hosts: hosts.filter(h => ipArray.includes(h.ip)),
		missing: ipArray.filter(ip => !hostIPs.includes(ip))
	}
}

/**
* Search for one or multiple, full or partial mac addresses
* @param {String/Array} macArray - array of full or partial mac addresses to search
* 
* @returns {Promise} Promise object returns and object of responsive hosts (hosts) and unresponsive ip addresses (missing)
*/
Arpping.prototype.searchByMacAddress = async function(macArray) {
	if (!Array.isArray(macArray) || !macArray.length) {
		throw new Error(`Invalid macArray: ${macArray}. Search input should be an array of one or more mac address strings.`);
	}

	const hosts = await this.discover();
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
}

/**
* Search for devices with the designated mac address type
* @param {String} macType - mac type to search
* 
* @returns {Promise} Promise object returns an array of hosts with a matching mac type
*/
Arpping.prototype.searchByMacType = async function(macType) {
	macType = macType.toLowerCase();

	const hosts = await this.discover();
	return hosts.filter(h => h.type && h.type.toLowerCase() === macType);
}

module.exports = Arpping;
