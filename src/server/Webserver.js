/**
 * Spawns an HTTP(S) Server
 * @module Webserver
 * @requires './Server'
 * @requires './Logger'
 */

import Logger from '../util/Logger.js';
import https from 'https';
import http from 'http';
import Config from '../configuration/settings.config.js';
/** Webserver Class */

class Webserver {
    static Server;
    static Log;
    static Config;
    constructor() {
        this.Log = new Logger('Webserver');
        this.Config = Config.settings;
        this.#createWebserver();
    };
    #createWebserver() {
        const options = this.Config.secure ? {
            key: fs.readFileSync(this.Config.keyFile, { encoding: 'utf8' }),
            ca: fs.readFileSync(this.Config.chainFile, { encoding: 'utf8' }),
            cert: fs.readFileSync(this.Config.certFile, { encoding: 'utf8' }),
        } : {};
        this.Server = this.Config.secure ? https.createServer(options) : http.createServer(options);
        this.Log.write('Webserver Opened @ Port ' + this.Config.port);
    }
    static kill() {
        this.Log.write('Webserver Closing');
        this.Server.close();
    }
}

export default Webserver;