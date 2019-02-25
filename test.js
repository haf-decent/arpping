'use strict';

const arpping = require('./index.js')({
    timeout: 8,
    includeEndpoints: true
});

function test(fn, args, callback) {
    var start = Date.now();
    var cb = function() {
        var time = (Date.now() - start)/1000;
        callback(time, ...arguments);
    }
    args.push(cb);
    fn(...args);
}

//Find devices of the same type (from the same vendor) as your device
function example(callback) {
    console.log('Finding devices on your network with the same macType as your device...');
    arpping.findMyInfo((err, info) => {
        if (err) return console.log(err);
        arpping.arp([info.ip], (err, found) => {
            if (err) return console.log(err);
            if (found[0] && found[0].type) 
                arpping.search.byMacType(found[0].type, null, callback);
            else console.log('No type found for your device');
        });
    })
}

var tests = {
    example: () => {
        test(example, [], (time, err, found) => {
            if (err) return console.log(err);
            console.log(time);
            console.log(found);
        });
    },
    findMyInfo: () => {
        test(arpping.findMyInfo, [], (time, err, info) => {
            console.log('\n--------------------------------');
            if (err) return console.log('Error during findMyInfo: ' + err);
            console.log(info);
            console.log(`\nFinished finding info in ${time}s`);
        });
    },
    discover: (refIP) => {
        test(arpping.discover, [refIP], (time, err, hosts) => {
            console.log('\n--------------------------------');
            if (err) return console.log('Error during discover: ' + err);
            console.log(JSON.stringify(hosts, null, 4));
            console.log(`\nFinished discover scan in ${time}s`);
        });
    },
    searchByIpAddress: (ips, refIP) => {
        test(arpping.search.byIpAddress, [ips, refIP], (time, err, found, missing) => {
            console.log('\n--------------------------------');
            if (err) return console.log('Error during searchByIpAddress: ' + err);
            console.log(`Found ${found.length} hosts:\n${JSON.stringify(found, null, 4)}`);
            console.log(`${missing.length} hosts missing:\n' ${missing}`);
            console.log(`\nFinished search by ip in ${time}s`);
        });
    },
    searchByMacAddress: (macs, refIP) => {
        test(arpping.search.byMacAddress, [macs, refIP], (time, err, found, missing) => {
            console.log('\n--------------------------------');
            if (err) return console.log('Error during searchByMacAddress: ' + err);
            console.log(`Found ${found.length} hosts:\n${JSON.stringify(found, null, 4)}`);
            console.log(`${missing.length} hosts missing:\n' ${missing}`);
            console.log(`\nFinished search by mac in ${time}s`);
        });
    },
    searchByMacType: (type, refIP) => {
        test(arpping.search.byMacType, [type, refIP], (time, err, found) => {
            console.log('\n--------------------------------');
            if (err) return console.log('Error during searchByMacType: ' + err);
            console.log(`Found ${found.length} hosts:\n${JSON.stringify(found, null, 4)}`);
            console.log(`\nFinished search by macType in ${time}s`);
        });
    },
    ping: (ips) => {
        test(arpping.ping, [ips], (time, err, found, missing) => {
            console.log('\n--------------------------------');
            if (err) return console.log('Error during ping: ' + err);
            console.log(`Found ${found.length} hosts:\n${found.join('\n')}`);
            console.log(`${missing.length} hosts missing:\n' ${missing}`);
            console.log(`\nFinished ping in ${time}s`);
        });
    },
    arp: (ips) => {
        test(arpping.arp, [ips], (time, err, found, missing) => {
            console.log('\n--------------------------------');
            if (err) return console.log('Error during arp: ' + err);
            console.log(`Found ${found.length} hosts:\n${JSON.stringify(found, null, 4)}`);
            console.log(`${missing.length} hosts missing:\n' ${missing}`);
            console.log(`\nFinished arp in ${time}s`);
        });
    }
}

var input = process.argv;
if (!tests[input[2]]) return console.log(
    `Invalid command: ${input[2]} 
    \nValid commands:\n- ${Object.keys(tests).join('\n- ')}`
);

if (input[4]) tests[input[2]](input[3].split(','), input[4]);
else if (input[3]) tests[input[2]](input[3].indexOf(',') > -1 ? input[3].split(','): input[3]);
else tests[input[2]]();