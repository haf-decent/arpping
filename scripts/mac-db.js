const fs = require('fs/promises');
const { createWriteStream, write } = require('fs');
const https = require('https');

/**
 * Pulls the DB of MAC addresses and formats it in JSON.
 * It can also update the DB if needed.
 */

// IEEE Mac address DB
const dbUrl = 'https://standards-oui.ieee.org/oui/oui.csv';
const dbPath = `${__dirname}/mac-db.csv`;
const jsonPath = `${__dirname}/../src/mac.json`;

const downloadDb = () => new Promise(res => {
    https.get(dbUrl, (result) => {
        const filePath = createWriteStream(dbPath);
        result.pipe(filePath);

        filePath.on('finish',() => {
            filePath.close();
            res();
        });
    });
});

const convertCsvToJson = async () => {
    let jsonData = {};
    
    const data = await fs.readFile(dbPath, 'utf-8');
    const lines = data.split(/\r?\n/).slice(1);
    lines.forEach(line => {
        // [0] Registry, [1] Assignment, [2] Organization Name, [3] Organization Address
        const columns = line.split(/(?!\B"[^"]*),(?![^"]*"\B)/);
        
        // Skip invalid lines
        if (columns.length < 4) {
            return;
        }
        
        const mac = [
            columns[1].substring(0, 2),
            columns[1].substring(2, 4),
            columns[1].substring(4),
        ].join(':');
        const vendor = columns[2].replace(/\"/g, '');

        jsonData[mac] = vendor;
    });

    await fs.writeFile(jsonPath, JSON.stringify(jsonData), 'utf-8');
};

const init = async () => {
    // Check if file exists, download it if not
    try {
        await fs.stat(dbPath);
    } catch {
        await downloadDb();
    }

    // Check if JSON file exists
    try {
        await fs.stat(jsonPath);
    } catch {
        await convertCsvToJson();
    }
};

// Same as init but without skipping over existing files (will override them)
const update = async () => {
    await downloadDb();
    await convertCsvToJson();
};

const [,, command] = process.argv

switch (command) {
    case 'init':
        init();
        return;
    case 'update':
        update();
        return;
    default:
        console.log('Unknown command.');
        return;
}
