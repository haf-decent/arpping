'use strict';

const Arpping = require('./index.js');
const arpping = new Arpping({
    timeout: 4,
    includeEndpoints: true,
    useCache: true,
    cacheTimeout: 30
});

const tests = {
    findMyInfo: info => console.log(info),
    discover: hosts => console.log(`${hosts.length} host(s) found:\n${JSON.stringify(hosts, null, 4)}`),
    searchByIpAddress: ({ hosts, missing }) => {
        console.log(`Found ${hosts.length} host(s):\n${JSON.stringify(hosts, null, 4)}`);
        console.log(`${missing.length} host(s) missing:\n${missing}`);
    },
    searchByMacAddress: ({ hosts, missing }) => {
        console.log(`Found ${hosts.length} host(s):\n${JSON.stringify(hosts, null, 4)}`);
        console.log(`${missing.length} host(s) missing:\n${missing}`);
    },
    searchByMacType: hosts => console.log(`Found ${hosts.length} host(s):\n${JSON.stringify(hosts, null, 4)}`),
    ping: ({ hosts, missing }) => {
        console.log(`Found ${hosts.length} host(s):\n${hosts.join('\n')}`);
        console.log(`${missing.length} host(s) missing:\n${missing}`);
    },
    arp: ({ hosts, missing }) => {
        console.log(`Found ${hosts.length} host(s):\n${JSON.stringify(hosts, null, 4)}`);
        console.log(`${missing.length} host(s) missing:\n${missing}`);
    }
}

var start = Date.now();
var input = process.argv;

const errHandler = err => console.log(`Error during ${input[2]}: ${err}`);
const timeHandler = () => console.log(`\nFinished ${input[2]} in ${(Date.now() - start)/1000}s`)

console.log('\n--------------------------------');

if (input[2] == 'example') {
    console.log('Finding devices on your network with the same macType as your device...');
    arpping.findMyInfo()
      .then(info => {
          if (info.type) return arpping.searchByMacType(info.type);
          console.log(`No mac type found for your device`);
      })
      .then(hosts => console.log(`Found ${hosts.length} host(s) with your Mac Type (${info.type}):\n${JSON.stringify(hosts, null, 4)}`))
      .catch(errHandler);
}
else if (!tests[input[2]]) return console.log(
    `Invalid command: ${input[2]} 
    \nValid commands:\n- ${Object.keys(tests).join('\n- ')}`
);
else if (input[4] || input[2].indexOf('search') > -1) {
    arpping[input[2]](input[3].trim().split(','), input[4]).then(tests[input[2]]).then(timeHandler).catch(errHandler);
}
else if (input[3]) {
    arpping[input[2]](input[3].trim().split(',')).then(tests[input[2]]).then(timeHandler).catch(errHandler);
}
else {
    arpping[input[2]]().then(tests[input[2]]).then(timeHandler).catch(errHandler);
}