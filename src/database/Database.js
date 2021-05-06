/**
 * The database module that the SQLite/MySQL utils and classes will build off of.
 * @module Database
 */

import Config from '../configuration/settings.config.js';
import Logger from '../util/Logger.js';

/** Main Database Class */
class Database {
    static Action;
    static Config;
    static Log;
    constructor(type) {
        this.Config = Config.settings[type];
        this.Log = new Logger(type);
        this.Action = null;
    }
}
export default Database;