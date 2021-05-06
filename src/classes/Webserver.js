/**
 * Spawns an HTTP(S) Server
 * @module Webserver
 * @requires './Server'
 * @requires './Logger'
 */

import Logger from './Logger.js';
import https from 'https';
import http from 'http';
import Config from '../configuration/settings.config.js';
/** Websocket Class */

class Webserver {
    static Server;
    static Log

    constructor() {
        this.Log = new Logger('Webserver');
        this.#createWebserver();
    };
    #createWebserver() {
        const options = Config.settings.secure ? {
            key: fs.readFileSync(Config.settings.keyFile, { encoding: 'utf8' }),
            ca: fs.readFileSync(Config.settings.chainFile, { encoding: 'utf8' }),
            cert: fs.readFileSync(Config.settings.certFile, { encoding: 'utf8' }),
        } : {};
        this.Server = Config.settings.secure ? https.createServer(options) : http.createServer(options);
        this.Log.write('Webserver Opened @ Port ' + Config.settings.port);
    }
    static kill() {
        this.Log.write('Webserver Closing');
        this.Server.close();
    }
}

export default Webserver;