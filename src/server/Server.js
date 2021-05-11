/**
 * The main module that connects everything together.
 * @module Server
 * @requires "./database/Database.js"
 */

import MySQL from './database/MySQL.js';
import SQLite from './database/SQLite.js';
import WebsocketManager from './WSManager.js';

/** Base class that (most) other classes will build off of. */
class Server {
    #Cache;
    static DB;
    static Log;
    static Config;
    constructor() {
        this.WSManager = new WebsocketManager();
        this.Util = this.WSManager.Util; // no sense in creating another instance if we can just borrow it /shrug
        this.Config = this.WSManager.Config; // its the same config
        this.Log = new this.Util.Log('Server');
        this.Util.loadEnv(this);
        this.#Cache = new Map();
        this.DB = this.Config.database.MySQL ? new MySQL(this.Config.MySQL) : new SQLite(this.Config.SQLite);
        this.DB.on('ready', () => this.WSManager.Server.listen(this.Config.port));
    };
}

export default Server;