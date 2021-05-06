/**
 * The database module that the SQLite subclasses will build off of.
 * @module SQLite
 * @requires 'better-sqlite3'
 */

// import Driver from 'better-sqlite3'; // To be used when implemented
import Logger from './Logger.js';

/** Main MySQL Class */
class SQLite {
    static Action;
    #Config;
    static Log;
    static Connection;
    constructor(config) {
        this.#Config = config;
        this.Log = new Logger('SQLite');
        this.Connection = null;
    }
}
export default SQLite;