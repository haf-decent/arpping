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

`$ npm install -save arpping`

## Usage
To include in a project file:

```javascript
const Arpping = require('arpping');
var arpping = new Arpping(options);
```

The arpping module returns a function that accepts an optional `options` object. Valid parameters include:

|Parameter |Default |Description |
|-----------|---------|-------------|
| timeout | 5 | The time, in seconds, ping will try to send packets to a device before returning results |
| includeEndpoints | false | Specify if you'd like to include range endpoints (1, 255) in your scans |
| useCache | true | Specify if you'd like to temporarily cache results for quicker and convenient usage |
| cacheTimeout | 3600 | Specify the cache's TTL (time to live) in seconds |

### Properties
Each parameter can be changed dynamically after initialization. In addition, the IP address of the host device is also available as the `myIP` property (once it is found)

### Methods
The Arpping object has the following Promise-based methods (with properly structured Promise chains):

#### findMyInfo
The findMyInfo method returns the ip, mac address, and mac type (if known) of the computer running the script (which is stored and used to get the LAN network ip range used in other methods)
```javascript
const Arpping = require('arpping');
var arpping = new Arpping(options);

arpping.findMyInfo()
    .then(info => console.log(info)) // ex. {"ip": "192.168.0.20", "mac": "01:23:45:67:89:01", "type": "RaspberryPi"}
    .catch(err => console.log(err));
```

#### discover
The discover method returns an array of hosts found on the local network. Each host entry contains the host's ip and mac address, and can also be assigned a type based on its mac address VendorID. The host entry that represents the computer running the script will have a "isHostDevice" key set with a value of true. By default, the discover scan will reference the host device's IP address to dictate the target range, but you can manually override this by passing a valid IP address.
```javascript
const Arpping = require('arpping');
var arpping = new Arpping(options);

arpping.discover()
    .then(hosts => console.log(JSON.stringify(hosts, null, 4)))
    .catch(err => console.log(err));

/* Example output
[
    {
        "ip": "192.168.0.3",
        "mac": "01:01:01:01:01:01"
    },
    {
        "ip": "192.168.0.12",
        "mac": "99:01:99:01:99:01"
    },
    {
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
var arpping = new Arpping(options);

var ipArray = [
    "192.168.0.3",
    "192.168.0.12",
    "192.168.0.24"
];
arpping.searchByIpAddress(ipArray, '192.168.0.1')
    .then(({ hosts, missing }) => {
        var h = hosts.length, m = missing.length;
        console.log(`${h} out of ${h + m} host(s) found:\n${JSON.stringify(hosts, null, 4)}`);
        console.log(`${m} out of ${h + m} host(s) not found:\n${missing}`);
    })
    .catch(err => console.log(err));

/* Example output
2 out of 3 host(s) found:
[
    {
        "ip": "192.168.0.3",
        "mac": "01:01:01:01:01:01"
    },
    {
        "ip": "192.168.0.12",
        "mac": "01:01:01:99:99:99"
    }
]
1 out of 3 host(s) not found:
["192.168.0.24"]
*/
```

###### searchByMacAddress
Searching by mac address functions similarly to the byIpAddress method, with the notable additional ability to search by partial mac addresses (i.e. "01:23:45:67:89:10" which only matches one device vs "01:23:45" which may match multiple devices). Each device found will have a "matched" array specifying the corresponding searched mac address(es). Again, the Promise resolves an object with an array of found `hosts` and an array of `missing` search terms.
```javascript
const Arpping = require('arpping');
var arpping = new Arpping(options);

var macArray = [
    "01:01:01",
    "01:01:01:99:99:99",
    "7f:54:12"
];
arpping.searchByMacAddress(macArray)
    .then(({ hosts, missing }) => {
        var h = hosts.length, m = missing.length;
        console.log(`${h} matching host(s) found:\n${JSON.stringify(hosts, null, 4)}`);
        console.log(`The following search term(s) returned no results:\n${missing}`);
    })
    .catch(err => console.log(err));

/* Example output
2 matching host(s) found:
[
    {
        "ip": "192.168.0.3",
        "mac": "01:01:01:01:01:01",
        "matched": [
            "01:01:01"
        ]
    },
    {
        "ip": "192.168.0.12",
        "mac": "01:01:01:99:99:99",
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
var arpping = new Arpping(options);

var type = "RaspberryPi";
arpping.searchByMacType(type)
    .then(hosts => console.log(`${hosts.length} host(s) found with type: ${type}\n${JSON.stringify(hosts, null, 4)}`))
    .catch(err => console.log(err));

/* Example output
1 host(s) found with type: RaspberryPi
[
    {
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
var arpping = new Arpping(options);

var ipArray = null; // set to null to scan the full ip range (xxx.xxx.x.2 - 254);
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
var arpping = new Arpping(options);

// must specify an array, unlike ping
var ipArray = [
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
        "ip": "192.168.0.3",
        "mac": "01:01:01:01:01:01"
    },
    {
        "ip": "192.168.0.12",
        "mac": "01:01:01:99:99:99"
    }
]
The following ip address(es) returned no results:
["192.168.0.24"]
*/
```

## Updates
1. Build out vendorID lookup table, or find some third-party version to include in project
2. ~~Allow for more customization - custom ip ranges to scan, enable/disable scanning of xxx.xxx.x.1,255, etc.~~
3. Other stuff I haven't thought of yet
4. ???
5. Profit

## Contributing
I made this module on my own. Any help/feedback is appreciated.
