/**
 * Spawns an HTTP(S) Server
 * @module Webserver
 * @requires './Server'
 * @requires './Logger'
 */

import https from 'https';
import http from 'http';
import Config from '../configuration/settings.config.js';
import EventEmitter from 'events';
import Util from '../util/Util.js';
/** Webserver Class */

class Webserver extends EventEmitter {
    static Server;
    static Util;
    static Log;
    static Config;
    #options = Config.settings.secure ? {
        key: fs.readFileSync(Config.settings.keyFile, { encoding: 'utf8' }),
        ca: fs.readFileSync(Config.settings.chainFile, { encoding: 'utf8' }),
        cert: fs.readFileSync(Config.settings.certFile, { encoding: 'utf8' }),
    } : {};
    constructor() {
        super();
        this.Util = new Util();
        this.Log = new this.Util.Log('Webserver');
        this.Config = Config.settings;
        this.Server = this.Config.secure ? https.createServer(this.#options) : http.createServer(this.#options);
        this.Log.write('Webserver Opened @ Port ' + this.Config.port);
    };
    kill() {
        this.Log.write('Webserver Closing');
        this.Server.close();
    }
}

export default Webserver;