'use strict';

const Arpping = require('./index.js');
var arpping = new Arpping({
    timeout: 4,
    includeEndpoints: true,
    useCache: true,
    cacheTimeout: 30
});

const tests = {
    findMyInfo: (err, info) => {
        console.log('\n--------------------------------');
        if (err) return console.log('Error during findMyInfo: ' + err);
        console.log(info);
        console.log(`\nFinished finding info in ${(Date.now() - start)/1000}s`);
    },
    discover: (err, hosts) => {
        console.log('\n--------------------------------');
        if (err) return console.log('Error during discover: ' + err);
        console.log(JSON.stringify(hosts, null, 4));
        console.log(`\nFinished discover scan in ${(Date.now() - start)/1000}s`);
    },
    searchByIpAddress: (err, found, missing) => {
        console.log('\n--------------------------------');
        if (err) return console.log('Error during searchByIpAddress: ' + err);
        console.log(`Found ${found.length} host(s):\n${JSON.stringify(found, null, 4)}`);
        console.log(`${missing.length} host(s) missing:\n${missing}`);
        console.log(`\nFinished search by ip in ${(Date.now() - start)/1000}s`);
    },
    searchByMacAddress: (err, found, missing) => {
        console.log('\n--------------------------------');
        if (err) return console.log('Error during searchByMacAddress: ' + err);
        console.log(`Found ${found.length} host(s):\n${JSON.stringify(found, null, 4)}`);
        console.log(`${missing.length} host(s) missing:\n${missing}`);
        console.log(`\nFinished search by mac in ${(Date.now() - start)/1000}s`);
    },
    searchByMacType: (err, found) => {
        console.log('\n--------------------------------');
        if (err) return console.log('Error during searchByMacType: ' + err);
        console.log(`Found ${found.length} host(s):\n${JSON.stringify(found, null, 4)}`);
        console.log(`\nFinished search by macType in ${(Date.now() - start)/1000}s`);
    },
    ping: (err, found, missing) => {
        console.log('\n--------------------------------');
        if (err) return console.log('Error during ping: ' + err);
        console.log(`Found ${found.length} host(s):\n${found.join('\n')}`);
        console.log(`${missing.length} host(s) missing:\n${missing}`);
        console.log(`\nFinished ping in ${(Date.now() - start)/1000}s`);
    },
    arp: (err, found, missing) => {
        console.log('\n--------------------------------');
        if (err) return console.log('Error during arp: ' + err);
        console.log(`Found ${found.length} host(s):\n${JSON.stringify(found, null, 4)}`);
        console.log(`${missing.length} host(s) missing:\n${missing}`);
        console.log(`\nFinished arp in ${(Date.now() - start)/1000}s`);
    }
}

var start = Date.now();
var input = process.argv;

if (input[2] == 'example') {
    console.log('Finding devices on your network with the same macType as your device...');
    arpping.findMyInfo((err, info) => {
        if (err) return console.log(err);
        if (info.type) arpping.searchByMacType(info.type, null, (err, found) => {
            if (err) return console.log(err);
            console.log(`Found ${found.length} host(s) with your Mac Type (${host[0].type}):\n${JSON.stringify(found, null, 4)}`);
        });
        else console.log(`No mac type found for your device`);
    });
}
else if (!tests[input[2]]) return console.log(
    `Invalid command: ${input[2]} 
    \nValid commands:\n- ${Object.keys(tests).join('\n- ')}`
);
else if (input[4] || input[2].indexOf('search') > -1) arpping[input[2]](input[3].trim().split(','), input[4], tests[input[2]]);
else if (input[3]) arpping[input[2]](input[3].trim().split(','), tests[input[2]]);
else if (input[2] == 'discover') arpping[input[2]](null, tests[input[2]]);
else arpping[input[2]](tests[input[2]]);