const Arpping = require('./dist/index.js');
const arpping = new Arpping({
	timeout: 2,
	includeEndpoints: true,
	useCache: true,
	cacheTimeout: 30,
	debug: true
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
const [,, command, ...args ] = process.argv;

const errHandler = err => console.log(`Error during ${command}: ${err.stack}`);
const timeHandler = () => {
	console.log(`\nFinished ${command} in ${(Date.now() - start)/1000}s`);
	process.exit();
}

console.log('\n--------------------------------');

if (command == 'example') {
	console.log('Finding devices on your network with the same macType as your device...');
	const { type = null } = arpping.myDevice;
	if (!type) return console.log(`No mac type found for your device`);
	arpping.searchByMacType(type)
		.then(onFound)
		.then(timeHandler)
		.catch(errHandler);
}
else if (!tests[ command ]) console.log(`Invalid command: ${command} \nValid commands:\n- ${[ "example", ...Object.keys(tests) ].join('\n- ')}`);
else {
	if (args[0]) args[0] = args[0].trim().split(',');
	arpping[ command ](...args)
		.then(tests[ command ])
		.then(timeHandler)
		.catch(errHandler)
}