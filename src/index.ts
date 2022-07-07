const os = require('os');
const { Netmask } = require('netmask');
const { execFile } = require('child_process');

import macLookup from './macLookup';

let flag: string;
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

type ValueAllSettled<T> = {
	status: 'fulfilled' | 'rejected',
	value?: T,
	reason?: string
}

type Interface = 'lo0' | 'en0' | 'eth0' | 'wlan0';

type Connection = {
	name?: Interface,
	internal?: boolean,
	family?: 'IPv4' | 'IPv6',
	address?: string,
	netmask?: number | string
}

type Device = {
	os: 'Windows_NT' | 'Linux' | 'Darwin',
	connection?: Connection | null,
	type?: string | null
}

type InterfaceFilters = {
	interface?: Interface[],
	internal?: boolean[],
	family?: ('IPv4' | 'IPv6')[]
}

type Host = {
	ip: string,
	mac: string,
	name?: string,
	type?: string | null,
	isHostDevice?: boolean,
	matched?: string[]
}

type Props = {
	timeout?: number,
	includeEndpoints?: boolean,
	useCache?: boolean,
	cacheTimeout?: number,
	interfaceFilters?: InterfaceFilters,
	connectionInterval?: number,
	onConnect?: ((connection: Connection) => void)[],
	onDisconnect?: (() => void)[],
	debug?: boolean
}

class Arpping {
	static osType: string = osType;
	
	/**
	* Static wrapper for `os` module's `networkInterfaces` function
	* @returns {object} list of available interfaces organized by interface name
	*/
	static getNetworkInterfaces() {
		return os.networkInterfaces() as { [key: string]: {
			address: string,
			netmask: string,
			family: 'IPv4' | 'IPv6',
			mac: string,
			internal: boolean,
			cidr: string
		}[] };
	}

	timeout: number;
	debug: boolean;
	includeEndpoints: boolean;
	useCache: boolean;
	cache: Host[];
	cacheTimeout: number;
	cacheUpdate: number;
	interfaceFilters: InterfaceFilters;
	myDevice: Device;
	onConnect: ((connection: Connection) => void)[];
	onDisconnect: (() => void)[];
	interval?: NodeJS.Timer;

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
	constructor({
		timeout = 3,
		includeEndpoints = false,
		useCache = true,
		cacheTimeout = 3600,
		interfaceFilters = {},
		connectionInterval = 600,
		onConnect = [],
		onDisconnect = [],
		debug = false
	}: Props = {}) {
		if (timeout < 1 || timeout > 60) throw new Error(`Invalid timeout parameter: ${timeout}. Timeout should be between 1 and 60.`);
		this.timeout = parseInt(timeout.toString());
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
	* Filter network interfaces to find active internet connections
	* @param {object} [interfaceFilters]
	* @param {string[]} [interfaceFilters.interface] - array of acceptable interface names
	* @param {boolean[]} [interfaceFilters.internal] - array specifying internal and/or external network status
	* @param {string[]} [interfaceFilters.family] - array specifying IPv4 and/or IPv6 (untested, probably unsupported)
	* 
	* @returns {object | null}
	*/
	getConnection({
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
				this.myDevice.connection = {
					name: name as Interface,
					...connection
				};
				this.myDevice.type = macLookup(connection.mac);
				if (!wasConnected) {
					if (this.debug) console.log(`Interface ${name} connected`);
					this.onConnect.forEach(callback => callback(this.myDevice.connection as Connection));
				}
				return this.myDevice.connection;
			}
		}
		if (wasConnected) {
			if (this.debug) console.log(`Interface ${(this.myDevice.connection as Connection).name} disconnected`);
			this.onDisconnect.forEach(callback => callback());
		}
		this.myDevice.connection = null;
		return null;
	}

	/**
	* Build array of full ip range (xxx.xxx.x.1-255) host device's ip address
	* @param {number | string} [netmaskOverride] - optional number or string netmask value
	* 
	* @returns {string[]}
	*/
	_getFullRange(netmaskOverride?: number | string | undefined) {
		if (!this.myDevice.connection) {
			if (this.debug) console.log(`No connection available`);
			return [];
		}
		const { connection: { address, netmask } } = this.myDevice;
		const block = new Netmask(address, netmaskOverride || netmask);
		const range = [];
		if (this.includeEndpoints) {
			range.push(block.base);
			block.forEach((ip: string) => range.push(ip));
			range.push(block.broadcast);
		}
		else block.forEach((ip: string) => range.push(ip));
	
		return range;
	}

	/**
	* Ping a range of ip addresses
	* @param {string[]} [range] - array of ip addresses to ping, defaults to full netmask range
	* 
	* @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
	*/
	async ping(range?: string[]) {
		if (!this.myDevice.connection) throw new Error('No connection!');
		if (!range) {
			range = this._getFullRange();
			if (!range.length) throw new Error('No connection!');
		}
	
		const pings: Promise<string>[] = range.map(ip => new Promise((resolve, reject) => {
			execFile('ping', [ flag, this.timeout, ip ], (err: string, stdout: string) => {
				if (err || stdout.match(/100(\.0)?% packet loss/g)) return reject(ip);
				return resolve(ip);
			});
		}));
		const results = await Promise.allSettled(pings) as ValueAllSettled<string>[];
		return results.reduce((
			ret: { hosts: string[], missing: string[]},
			{ status, value = null, reason: ip = null }
		) => {
			if (status === 'fulfilled') ret.hosts.push(value as string);
			else ret.missing.push(ip as string);
			return ret;
		}, { hosts: [], missing: [] });
	}

	/**
	* Arp a range of ip addresses
	* @param {string[]} [range = []] - array of ip addresses to arp
	* 
	* @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
	*/
	async arp(range: string[] = []) {
		if (!this.myDevice.connection) throw new Error('No connection!');
	
		const arps = range.map(ip => new Promise((resolve, reject) => {
			execFile('arp', [ ...arpFlag, ip ], (err: string, stdout: string) => {
				if (err || stdout.includes('no entry') || stdout.includes('(incomplete)')) return reject(ip);
	
				const [ mac = null ] = stdout.match(/([0-9A-Fa-f]{1,2}[:-]){5}([0-9A-Fa-f]{1,2})/ig) || [];
				if (!mac) return reject(ip);
				const host: Host = { ip, mac, type: macLookup(mac) };
				if (ip === (this.myDevice.connection as Connection).address) host.isHostDevice = true;
				execFile('nslookup', [ ip ], (err: string, stdout: string) => {
					if (!err) {
						const [ name = null ] = stdout.match(/ = .*/) || [];
						if (!!name) host.name = name.substr(3, name.length - 4);
					}
					resolve(host);
				});
			});
		}));
		const results = await Promise.allSettled(arps) as ValueAllSettled<Host>[];
		return results.reduce((
			ret: { hosts: Host[], missing: string[] },
			{ status, value = null, reason: ip = null }
		) => {
			if (status === 'fulfilled') ret.hosts.push(value as Host);
			else ret.missing.push(ip as string);
			return ret;
		}, { hosts: [], missing: [] });
	}

	/**
	* Discover all hosts connected to your local network or based on a reference IP address
	* @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
	* 
	* @returns {Promise<object[]>} Promise returns an array of discovered host objects
	*/
	async discover(range?: string[]) {
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
	* Search for one or multiple IP addresses
	* @param {string[]} ipArray - array of ip addresses to search
	* 
	* @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
	*/
	async searchByIpAddress(ipArray: string[]) {
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
	* @param {string[]} macArray - array of full or partial mac addresses to search
	* @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
	* 
	* @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
	*/
	async searchByMacAddress(macArray: string[], range?: string[]) {
		if (!Array.isArray(macArray) || !macArray.length) {
			throw new Error(`Invalid macArray: ${macArray}. Search input should be an array of one or more mac address strings.`);
		}
	
		const hosts = await this.discover(range);
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
	* @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
	* 
	* @returns {Promise<object[]>} Promise returns an array of hosts with a matching mac type
	*/
	async searchByMacType(macType: string, range?: string[]) {
		macType = macType.toLowerCase();
	
		const hosts = await this.discover(range);
		return hosts.filter(h => h.type && h.type.toLowerCase() === macType);
	}
}

module.exports = Arpping;
export default Arpping;