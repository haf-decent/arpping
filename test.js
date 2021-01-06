const Arpping = require('./index.js');
const arpping = new Arpping({
    timeout: 4,
    includeEndpoints: true,
    useCache: true,
    cacheTimeout: 30
});

const tests = {
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

const start = Date.now();
const input = process.argv;

const errHandler = err => console.log(`Error during ${input[2]}: ${err.stack}`);
const timeHandler = () => console.log(`\nFinished ${input[2]} in ${(Date.now() - start)/1000}s`)

console.log('\n--------------------------------');

if (input[2] == 'example') {
    console.log('Finding devices on your network with the same macType as your device...');
    const { type = null } = arpping.myDevice;
    if (!type) return console.log(`No mac type found for your device`);
    arpping.searchByMacType(type)
        .then(hosts => {
            console.log(`Found ${hosts.length} host(s) with your Mac Type (${type}):\n${JSON.stringify(hosts, null, 4)}`)
        })
        .catch(errHandler);
}
else if (!tests[input[2]]) console.log(`Invalid command: ${input[2]} \nValid commands:\n- ${Object.keys(tests).join('\n- ')}`);
else {
    const args = input.slice(3);
    if (args[0]) args[0] = args[0].trim().split(',');
    arpping[ input[2] ](...args)
        .then(tests[ input[2] ])
        .then(timeHandler)
        .catch(errHandler)
}