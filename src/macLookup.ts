import macAddresses from './mac.json';

/**
* Cross references provided mac address with lookup table
* @param {String} mac
*
* @returns {String | undefined}
*/
export default (mac: string) => {
	const start = mac
		// Split on MAC separator (:)
		.split(':')
		// Get only the 3 first parts (vendor specific)
		.slice(0, 3)
		// Add leading 0 (if missing) and make it uppercase
		.map(part =>
			(
				new Array(2 - part.length)
				.fill('0')
				.join('') + 
				part
			).toUpperCase()
		)
		// Join them back together
		.join(':');

	return macAddresses[start];
};