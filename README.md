# arpping
Discover and search for internet-connected devices (locally) using ping and arp

## Installation
Using npm:
`npm install -save arpping`

## Usage
To include in a project file:
`var arpping = require('arpping')();`

The arpping module returns a function that accepts one argument, namely a timeout for ping scans. If passed no timeout parameter, arrpping will default to 10s (which in my experience has been more than enough time)

### Methods
The arpping object has the following methods (each with the appropraitely structured callback function):

#### findMyInfo
The findMyInfo method returns the ip and mac address of the computer running the script (which is stored and used to get the LAN network ip range used in other methods)
```
var arpping = require('arpping')();

arpping.findMyInfo((err, info) => {
  if (err) return console.log(err);
  console.log(info); // ex. {"ip": "192.168.0.20", "mac": "01:23:45:67:89:01"}
});
```

#### discover
The discover method returns an array of hosts found on the local network. Each host entry contains the host's ip and mac address, and can also be assigned a type based on its mac address VendorID. The host entry that represents the computer running the script will have a "isYourDevice" key set with a value of true.

The discover method also ignores the end ip addresses (i.e. xxx.xxx.x.1 and xxx.xxx.x.255) as these usually correspond to the wifi router/broadcast address
```
var arpping = require('arpping')();

arpping.discover((err, hosts) => {
  if (err) return console.log(err);
  console.log(JSON.stringify(hosts, null, 4)); 
});

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
The search functionality is broken up into three methods

###### byIpAddress
Searching by ip address runs a discovery scan and filters the result based on an input array of desired ip addresses
```
var arpping = require('arpping')();

var ipArray = [
  "192.168.0.3",
  "192.168.0.12",
  "192.168.0.24"
];
arpping.search.byIpAddress(ipArray, (err, found, missing) => {
  if (err) return console.log(err);
  var f = found.length, m = missing.length;
  console.log(f + ' out of ' + (f + m) + ' host(s) found:');
  if (f) console.log(JSON.stringify(found, null, 4));
  console.log(m + ' out of ' + (f + m) + ' host(s) not found:');
  if (m) console.log(missing);
});

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

###### byMacAddress
Searching by mac address functions similarly to the byIpAddress method, with the notable additional ability to search by partial mac addresses (i.e. "01:23:45:67:89:10" which only matches one device vs "01:23:45" which may match multiple devices)
```
var arpping = require('arpping')();

var macArray = [
  "01:01:01",
  "01:01:01:99:99:99",
  "7f:54:12"
];
arpping.search.byIpAddress(macArray, (err, found, missing) => {
  if (err) return console.log(err);
  var f = found.length, m = missing.length;
  console.log(f + ' matching host(s) found:');
  if (f) console.log(JSON.stringify(found, null, 4));
  if (m) {
    console.log('The following search term(s) returned no results:');
    console.log(missing);
  }
});

/* Example output
2 matching host(s) found:
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
The following search term(s) returned no results:
["7f:54:12"]
*/
```

###### byMacType
Searching by mac type returns all devices that are assigned the specified mac type/vendor (note: my mac address lookup table is painfully sparse)
```
var arpping = require('arpping')();

var type = "RaspberryPi";
arpping.search.byMacType(type, (err, found) => {
  if (err) return console.log(err);
  console.log(found.length + ' host(s) found with type: ' + type);
  if (found.length) console.log(JSON.stringify(found, null, 4));
});

/* Example output
1 host(s) found with type: RaspberryPi
[
  {
    "ip": "",
    "mac": "",
    "type": "RaspberryPi",
    "isYourDevice": true
  }
]
*/
```

#### ping
The ping method pings a given array of ip addresses (or the full ip range) and returns an array of those addresses that respond as well as an array of those addresses that do not
```
var arpping = require('arpping')();

var ipArray = null; // set to null to scan the full ip range (xxx.xxx.x.2 - 254);
arpping.ping(ipArray, (err, found, missing) => {
  if (err) return console.log(err);
  console.log(found.length + ' host(s) found');
  if (found.length) console.log(found);
});

/* Example output
3 host(s) found:
["192.168.0.3", "192.168.0.12", "192.168.0.20"]
*/
```

#### arp
The arp method arps a given array of ip addresses and returns an array of hosts that respond as well as an array of hosts that do not
```
var arpping = require('arpping')();

// must specify an array, unlike ping
var ipArray = [
  "192.168.0.3", 
  "192.168.0.12", 
  "192.168.0.24"
];
arpping.ping(ipArray, (err, found, missing) => {
  if (err) return console.log(err);
  var f = found.length, m = missing.length;
  console.log(f + ' matching host(s) found:');
  if (f) console.log(JSON.stringify(found, null, 4));
  if (m) {
    console.log('The following ip address(es) returned no results:');
    console.log(missing);
  }
});

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
2. Allow for more customization - custom ip ranges to scan, enable/disable scanning of xxx.xxx.x.1,255, etc.
3. Other stuff I haven't thought of yet
4. ???
5. Profit

## Contributing
I made this module on my own. Any help/feedback is appreciated.
