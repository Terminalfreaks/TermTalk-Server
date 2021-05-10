/**
 * The main module that connects everything together.
 * @module Server
 * @requires "./database/Database.js"
 * @requires './Logger'
 */

import MySQL from './database/MySQL.js';
import SQLite from './database/SQLite.js';
import Logger from '../util/Logger.js';
import WebsocketManager from './WSManager.js';
import Config from '../configuration/settings.config.js';
import dotenv from 'dotenv';

/** Base class that (most) other classes will build off of. */
class Server {
    #Cache;
    static DB;
    static Log;
    static Config;
    constructor() {
        this.Log = new Logger('Server');
        this.Config = Config.settings;
        this.#Cache = new Map();
        this.#loadEnv();
        this.WSManager = new WebsocketManager();
        this.DB = this.Config.database.MySQL ? new MySQL(this.Config.MySQL) : new SQLite(this.Config.SQLite);
        this.DB.on('ready', () => this.WSManager.Server.listen(this.Config.port));
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