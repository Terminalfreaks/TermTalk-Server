/**
 * The main module that connects everything together.
 * @module Server
 * @requires './MySQL' OR @requires './SQLite'
 * @requires './Logger'
 */

import MySQL from '../database/MySQL.js';
import SQLite from '../database/SQLite.js';
import Logger from '../util/Logger.js';
import Websocket from '../websocket/Websocket.js';
import dotenv from 'dotenv';
/** Base class that (most) other classes will build off of. */
class Server extends Websocket {
    #Cache;
    static DB;
    static Log;
    constructor() {
        super();
        this.Log = new Logger('Server');
        this.#Cache = new Map();
        this.#loadEnv();
        this.DB = this.Config.database.MySQL ? new MySQL(this.Config.MySQL) : new SQLite(this.Config.SQLite);
    };
    #loadEnv() {
        try {
            dotenv.config();
            if (this.Config.database.MySQL) this.Config.MySQL.password = process.env.MYSQL_ACCESS_KEY;
        } catch (error) {
            this.Log.exit(error);
        } finally {
            this.Log.write('Loaded Environment Variables');
        }
    }
}

export default Server;