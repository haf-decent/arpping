/// <reference types="node" />
declare type Interface = 'lo0' | 'en0' | 'eth0' | 'wlan0';
declare type Connection = {
    name?: Interface;
    internal?: boolean;
    family?: 'IPv4' | 'IPv6';
    address?: string;
    netmask?: number | string;
};
declare type Device = {
    os: 'Windows_NT' | 'Linux' | 'Darwin';
    connection?: Connection | null;
    type?: string | null;
};
declare type InterfaceFilters = {
    interface?: Interface[];
    internal?: boolean[];
    family?: ('IPv4' | 'IPv6')[];
};
declare type Host = {
    ip: string;
    mac: string;
    name?: string;
    type?: string | null;
    isHostDevice?: boolean;
    matched?: string[];
};
declare type Props = {
    timeout?: number;
    includeEndpoints?: boolean;
    useCache?: boolean;
    cacheTimeout?: number;
    interfaceFilters?: InterfaceFilters;
    connectionInterval?: number;
    onConnect?: ((connection: Connection) => void)[];
    onDisconnect?: (() => void)[];
    debug?: boolean;
};
declare class Arpping {
    static osType: string;
    /**
    * Static wrapper for `os` module's `networkInterfaces` function
    * @returns {object} list of available interfaces organized by interface name
    */
    static getNetworkInterfaces(): {
        [key: string]: {
            address: string;
            netmask: string;
            family: 'IPv4' | 'IPv6';
            mac: string;
            internal: boolean;
            cidr: string;
        }[];
    };
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
    constructor({ timeout, includeEndpoints, useCache, cacheTimeout, interfaceFilters, connectionInterval, onConnect, onDisconnect, debug }?: Props);
    /**
    * Filter network interfaces to find active internet connections
    * @param {object} [interfaceFilters]
    * @param {string[]} [interfaceFilters.interface] - array of acceptable interface names
    * @param {boolean[]} [interfaceFilters.internal] - array specifying internal and/or external network status
    * @param {string[]} [interfaceFilters.family] - array specifying IPv4 and/or IPv6 (untested, probably unsupported)
    *
    * @returns {object | null}
    */
    getConnection({ interface: interfaceName, internal, family }?: {
        interface?: string[] | undefined;
        internal?: boolean[] | undefined;
        family?: string[] | undefined;
    }): Connection | null;
    /**
    * Build array of full ip range (xxx.xxx.x.1-255) host device's ip address
    * @param {number | string} [netmaskOverride] - optional number or string netmask value
    *
    * @returns {string[]}
    */
    _getFullRange(netmaskOverride?: number | string | undefined): any[];
    /**
    * Ping a range of ip addresses
    * @param {string[]} [range] - array of ip addresses to ping, defaults to full netmask range
    *
    * @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
    */
    ping(range?: string[]): Promise<{
        hosts: string[];
        missing: string[];
    }>;
    /**
    * Arp a range of ip addresses
    * @param {string[]} [range = []] - array of ip addresses to arp
    *
    * @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
    */
    arp(range?: string[]): Promise<{
        hosts: Host[];
        missing: string[];
    }>;
    /**
    * Discover all hosts connected to your local network or based on a reference IP address
    * @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
    *
    * @returns {Promise<object[]>} Promise returns an array of discovered host objects
    */
    discover(range?: string[]): Promise<Host[]>;
    /**
    * Search for one or multiple IP addresses
    * @param {string[]} ipArray - array of ip addresses to search
    *
    * @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
    */
    searchByIpAddress(ipArray: string[]): Promise<{
        hosts: Host[];
        missing: string[];
    }>;
    /**
    * Search for one or multiple, full or partial mac addresses
    * @param {string[]} macArray - array of full or partial mac addresses to search
    * @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
    *
    * @returns {Promise<object>} Promise returns an object of responsive hosts (hosts) and unresponsive ip addresses (missing)
    */
    searchByMacAddress(macArray: string[], range?: string[]): Promise<{
        hosts: Host[];
        missing: string[];
    }>;
    /**
    * Search for devices with the designated mac address type
    * @param {String} macType - mac type to search
    * @param {string[]} [range] - array of ip addresses to search, defaults to all available addresses
    *
    * @returns {Promise<object[]>} Promise returns an array of hosts with a matching mac type
    */
    searchByMacType(macType: string, range?: string[]): Promise<Host[]>;
}
export default Arpping;
