/**
 * The main module that connects everything together.
 * @module Server
 * @requires './MySQL' OR @requires './SQLite'
 * @requires './Logger'
 */

import MySQL from './MySQL.js';
import SQLite from './SQLite.js';
import Config from '../configuration/example.settings.config.js';
import Logger from './Logger.js';

/** Base class that (most) other classes will build off of. */
class Server {
    #Cache;
    static DB;
    static Config;
    static Log;

    constructor() {
        this.#Cache = new Map();
        this.Config = Config.settings;
        this.Log = new Logger('Server');
        this.DB = this.Config.database.MySQL ? new MySQL(this.Config.MySQL) : new SQLite(this.Config.SQLite);
    };
}

export default Server;