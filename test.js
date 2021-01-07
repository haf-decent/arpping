const Arpping = require('./index.js');
const arpping = new Arpping({
    timeout: 4,
    includeEndpoints: true,
    useCache: true,
    cacheTimeout: 30
});

const onFound = hosts => console.log(`Found ${hosts.length} host(s):\n${JSON.stringify(hosts, null, 4)}`);
const onFoundAndMissing = ({ hosts, missing }) => {
    console.log(`Found ${hosts.length} host(s):\n${JSON.stringify(hosts, null, 4)}`);
    console.log(`${missing.length} host(s) missing:\n${missing}`);
}

const tests = {
    discover: onFound,
    searchByIpAddress: onFoundAndMissing,
    searchByMacAddress: onFoundAndMissing,
    searchByMacType: onFound,
    ping: onFoundAndMissing,
    arp: onFoundAndMissing
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
        .then(onFound)
        .catch(errHandler);
}
else if (!tests[ input[2] ]) console.log(`Invalid command: ${input[2]} \nValid commands:\n- ${Object.keys(tests).join('\n- ')}`);
else {
    const args = input.slice(3);
    if (args[0]) args[0] = args[0].trim().split(',');
    arpping[ input[2] ](...args)
        .then(tests[ input[2] ])
        .then(timeHandler)
        .catch(errHandler)
}