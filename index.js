const v3 = require('node-hue-api').v3;
const fs = require('fs');
const Tail = require('tail').Tail;
const PREFS_PATH = process.env.HOME + "/.video-device-hue.json";
const LOG_PATH = process.env.HOME + "/Library/Application Support/Objective-See/OverSight/OverSight.log";

// CHANGE THIS! or save into PREFS_PATH
const LIGHT_ID = 1;

let state = {
    audio: false,
    video: false,
};

async function main() {

    let auth = {};
    if (fs.existsSync(PREFS_PATH)) {
        auth = JSON.parse(fs.readFileSync(PREFS_PATH));
    } else {
        auth = await require('./create-user').discoverAndCreateUser();
        if (auth) {
            fs.writeFileSync(PREFS_PATH, JSON.stringify(auth));
        }
    }

    // discover hue hub and connect
    let searchResults = await v3.discovery.nupnpSearch();
    const api = v3.api.createLocal(searchResults[0].ipaddress).connect(auth.username);

    // tail log file
    const tail = new Tail(LOG_PATH, {useWatchFile: true, fsWatchOptions: {interval: 2000}});
    const re = /(audio|video) device became (active|inactive)/i;

    tail.on('error', console.error);
    tail.on('line', (line) => {
        const matches = re.exec(line);
        if (matches == null) return;

        const newValue = matches[2].toLowerCase() == 'active';
        const key = matches[1].toLowerCase();

        if (state[key] != newValue) {
            state[key] = newValue;
            onStateChange(key);
        }
    });

    async function onStateChange(key) {
        // only interested in video state
        if (key != 'video') return;
        const result = await api.lights.setLightState(LIGHT_ID, {on: state[key]});
    }

}

main();