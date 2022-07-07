# arpping
Discover and search for internet-connected devices (locally) using ping and arp

## Motivation
I was trying to find a quick and reliable way to ping and discover devices connected to my LAN. I tried out:

* [node-nmap](https://www.npmjs.com/package/node-nmap)
* [libnmap](https://www.npmjs.com/package/libnmap)
* [node-arp](https://www.npmjs.com/package/node-arp)

But both node-nmap and libnmap were slow and unreliable, and node-arp only had part of the functionality I needed, so I decided to make my own. This is the result, and it's been pretty helpful so far.

## Installation
Using npm:

```bash
npm install --save arpping
```

## Usage
To include in a project file:

```javascript
const Arpping = require('arpping');
const arpping = new Arpping(options);
```

The module returns the Arpping class. The Arpping constructor accepts an optional object argument with the following parameters:

|Parameter |Default |Description |
|-----------|---------|-------------|
| timeout | 5 | The time, in seconds, ping will try to send packets to a device before returning results |
| includeEndpoints | false | Specify if you'd like to include range endpoints (1, 255) in your scans |
| useCache | true | Specify if you'd like to temporarily cache results for quicker and convenient usage |
| cacheTimeout | 3600 | Specify the cache's TTL (time to live) in seconds |
| interfaceFilters | {} | Filters for specifying which network interface to connect to - valid filters are explained below |
| connectionInterval | 600 | The time interval, in seconds, for testing device's connection |
| onConnect | [] | An array of callback functions to be called when a new connection is established |
| onDisconnect | [] | An array of callback functions to be called when an existing connection is no longer active |
| debug | false | Enable/disable debug logging |


### Interface
Interfaces represent different network types, e.g. Ethernet, WiFi, self-hosted networks (hotspots). Each Arpping instance connects to one (and only one) of these network interfaces and is able to search and discover other devices on that network. Valid filters are arrays that specify valid values for each interface property. They include:

|Filter |Default |Description |
|-----------|---------|-------------|
| interface | `[ 'lo0', 'en0', 'eth0', 'wlan0' ]` | Allowed network interface names |
| internal | `[ false ]` | I think this should only ever be `[ false ]` as I don't believe external devices can connect to internal networks, but I left it as an option just in case |
| family | `[ IPv4 ]` | specify IPv4 and/or IPv6 network protocol |

Note: an empty array means any value is acceptable

### myDevice
An Arpping instance has the property `myDevice`, which lists the interpreted OS of the host machine (`instance.myDevice.os`).

On initialization, the Arpping instance will try to connect to the first network interface that satisfies the provided filters. If a valid connection is found, `myDevice` will also contain the device `type` based on its mac address (if it exists) and `connection` information, including the IP `address`, `mac` address, `netmask`, and IPv4/IPv6 `family`.

### getNetworkInterfaces Static Method
The Arpping class has a static method called `getNetworkInterfaces`, which simply wraps the [os module's](https://nodejs.org/api/os.html#os_os_networkinterfaces) `networkInterfaces` function, returning an object of available interfaces.
```javascript
const Arpping = require('arpping');

Arpping.getNetworkInterfaces();

/* Example output
{
  lo: [
    {
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: true,
      cidr: '127.0.0.1/8'
    },
    {
      address: '::1',
      netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
      family: 'IPv6',
      mac: '00:00:00:00:00:00',
      scopeid: 0,
      internal: true,
      cidr: '::1/128'
    }
  ],
  eth0: [
    {
      address: '192.168.1.108',
      netmask: '255.255.255.0',
      family: 'IPv4',
      mac: '01:02:03:0a:0b:0c',
      internal: false,
      cidr: '192.168.1.108/24'
    },
    {
      address: 'fe80::a00:27ff:fe4e:66a1',
      netmask: 'ffff:ffff:ffff:ffff::',
      family: 'IPv6',
      mac: '01:02:03:0a:0b:0c',
      scopeid: 1,
      internal: false,
      cidr: 'fe80::a00:27ff:fe4e:66a1/64'
    }
  ]
}
*/
```

### Methods
Any methods that depend on ping/arp (and therefore an active internet/interface connection) will throw an error if no connection is available.

#### getConnection
This method finds a valid interface connection based on the provided `interfaceFilters`. It sets the `myDevice.connection` property and returns it. It is run on initialization, and on an interval based on the `connectionInterval` parameter. You likely won't need to call this method manually.

Also, depending on the previous and current connection state, the `onConnect` or `onDisconnect` callbacks may fire. The onConnect callbacks will be passed the connection object.
```javascript
const Arpping = require('arpping');
const arpping = new Arpping({
  onConnect: [ connection => console.log(`Connected: ${JSON.stringify(connection, null, 4)}`) ]
});

const connection = arpping.getConnection({
  interface: [ 'en0' ],
  internal: [ false ],
  family: []
});

/* Example output
Connected: {
  name: 'en0',
  address: '192.168.1.108',
  netmask: '255.255.255.0',
  family: 'IPv4',
  mac: '01:02:03:0a:0b:0c',
  internal: false,
  cidr: '192.168.1.108/24'
}
*/
```

#### discover
The discover method returns an array of hosts found on the local network. Each host entry contains the host's name, ip and mac address, and can also be assigned a type based on its mac address VendorID. The host entry that represents the machine running the script will have a `isHostDevice` key set with a value of true.
```javascript
const Arpping = require('arpping');
const arpping = new Arpping(options);

arpping.discover()
  .then(hosts => console.log(JSON.stringify(hosts, null, 4)))
  .catch(err => console.log(err));

/* Example output
[
  {
    "name": "ryans-mbp-2",
    "ip": "192.168.0.3",
    "mac": "01:01:01:01:01:01",
    "type": null
  },
  {
    "name": "?",
    "ip": "192.168.0.12",
    "mac": "99:01:99:01:99:01",
    "type": null
  },
  {
    "name": "raspi-43c5",
    "ip": "192.168.0.20",
    "mac": "01:23:45:67:89:01",
    "type": "RaspberryPi",
    "isYourDevice": true
  }
]
*/
```

#### search
The search functionality is broken up into three methods. For each, you may pass a reference IP address as the second argument to override the default behavior.

###### searchByIpAddress
Searching by ip address runs a discovery scan and filters the result based on an input array of desired ip addresses. The Promise resolves an object with an array of found `hosts` and an array of `missing` ips.
```javascript
const Arpping = require('arpping');
const arpping = new Arpping(options);

const ipArray = [
  "192.168.0.3",
  "192.168.0.12",
  "192.168.0.24"
];
arpping.searchByIpAddress(ipArray)
  .then(({ hosts, missing }) => {
    console.log(`${hosts.length} host(s) found:\n${JSON.stringify(hosts, null, 4)}`);
    console.log(`${missing.length} host(s) missing:\n${missing}`);
  })
  .catch(err => console.log(err));

/* Example output
2 out of 3 host(s) found:
[
  {
    "name": "?",
    "ip": "192.168.0.3",
    "mac": "01:01:01:01:01:01",
    "type": null
  },
  {
    "name": "?",
    "ip": "192.168.0.12",
    "mac": "01:01:01:99:99:99",
    "type": null
  }
]
1 out of 3 host(s) not found:
["192.168.0.24"]
*/
```

###### searchByMacAddress
Searching by mac address functions similarly to the `byIpAddress` method, with the notable additional ability to search by partial mac addresses (i.e. "01:23:45:67:89:10" which only matches one device vs "01:23:45" which may match multiple devices). Each device found will have a `matched` array specifying the corresponding searched mac address(es). Again, the Promise resolves an object with an array of found `hosts` and an array of `missing` search terms.
```javascript
const Arpping = require('arpping');
const arpping = new Arpping(options);

const macArray = [
  "01:01:01",
  "01:01:01:99:99:99",
  "7f:54:12"
];
arpping.searchByMacAddress(macArray)
  .then(({ hosts, missing }) => {
    console.log(`${hosts.length} matching host(s) found:\n${JSON.stringify(hosts, null, 4)}`);
    console.log(`The following search term(s) returned no results:\n${missing}`);
  })
  .catch(err => console.log(err));

/* Example output
2 matching host(s) found:
[
  {
    "name": "?",
    "ip": "192.168.0.3",
    "mac": "01:01:01:01:01:01",,
    "type": null
    "matched": [
      "01:01:01"
    ]
  },
  {
    "name": "?",
    "ip": "192.168.0.12",
    "mac": "01:01:01:99:99:99",,
    "type": null
    "matched": [
      "01:01:01",
      "01:01:01:99:99:99"
    ]
  }
]
The following search term(s) returned no results:
["7f:54:12"]
*/
```

###### searchByMacType
Searching by mac type returns all devices that are assigned the specified mac type/vendor (note: my mac address lookup table is painfully sparse)
```javascript
const Arpping = require('arpping');
const arpping = new Arpping(options);

const type = 'RaspberryPi';
arpping.searchByMacType(type)
  .then(hosts => console.log(`${hosts.length} host(s) found with type: ${type}\n${JSON.stringify(hosts, null, 4)}`))
  .catch(err => console.log(err));

/* Example output
1 host(s) found with type: RaspberryPi
[
  {
    "name": "raspi-8008",
    "ip": "192.168.0.20",
    "mac": "01:23:45:67:89:01",
    "type": "RaspberryPi",
    "isYourDevice": true
  }
]
*/
```

#### ping
The ping method pings a given array of ip addresses (or the full ip range) and returns an array of `hosts` that respond as well as an array of those `missing` hosts that do not
```javascript
const Arpping = require('arpping');
const arpping = new Arpping(options);

const ipArray = null; // set to null to scan the full ip range
arpping.ping(ipArray)
  .then(({ hosts, missing }) => console.log(`${hosts.length} host(s) found:\n${hosts}`))
  .catch(err => console.log(err));

/* Example output
3 host(s) found:
["192.168.0.3", "192.168.0.12", "192.168.0.20"]
*/
```

#### arp
The arp method arps a given array of ip addresses and returns an array of `hosts` that respond as well as an array of `missing` hosts that do not
```javascript
const Arpping = require('arpping');
const arpping = new Arpping(options);

// must specify an array, unlike ping
const ipArray = [
  "192.168.0.3", 
  "192.168.0.12", 
  "192.168.0.24"
];
arpping.ping(ipArray)
  .then(({ hosts, missing }) => {
    console.log(`${hosts.length} matching host(s) found:\n${JSON.stringify(hosts, null, 4)}`);
    console.log(`The following ip address(es) returned no results:\n${missing}`)
  })
  .catch(err => console.log(err));

/* Example output
2 host(s) found:
[
  {
    "name": "?",
    "ip": "192.168.0.3",
    "mac": "01:01:01:01:01:01",
    "type": null
  },
  {
    "name": "?",
    "ip": "192.168.0.12",
    "mac": "01:01:01:99:99:99",
    "type": null
  }
]
The following ip address(es) returned no results:
["192.168.0.24"]
*/
```

## Updates
1. Build out vendorID lookup table, or find some third-party version to include in project
2. ~~Allow for more customization - custom ip ranges to scan, enable/disable scanning of xxx.xxx.x.1,255, etc.~~
3. ~~Typescript~~
4. Other stuff I haven't thought of yet
5. ???
6. Profit

## Contributing
I made this module on my own. Any help/feedback is appreciated.
