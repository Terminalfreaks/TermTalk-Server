/**
 * The main module that connects everything together.
 * @module Server
 * @requires './MySQL' OR @requires './SQLite'
 * @requires './Logger'
 */

import MySQL from './MySQL.js';
import SQLite from './SQLite.js';
import Config from '../configuration/settings.config.js';
import Logger from './Logger.js';
import Websocket from './Websocket.js';

/** Base class that (most) other classes will build off of. */
class Server extends Websocket {
    #Cache;
    static DB;
    static Config;
    static Log;
    constructor() {
        super();
        this.#Cache = new Map();
        this.Config = Config.settings;
        this.Log = new Logger('Server');
        this.DB = this.Config.database.MySQL ? new MySQL(this.Config.MySQL) : new SQLite(this.Config.SQLite);
    };
}

export default Server;