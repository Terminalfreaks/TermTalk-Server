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
    #Log = new Logger('Database'); // why two? - we want a private one for the Database class. Otherwise it is overriden.
    #Type;
    constructor(type) {
        this.Config = Config.settings[type];
        this.Log = new Logger(type);
        this.#Type = type;
        this.Action = null;
    }
    async check(connection) {
        let tables = ['banned', 'messages', 'rooms', 'userRooms', 'sessions', 'users'];
        if (this.#Type == 'MySQL') {
            const [rows] = await connection.execute('show tables');
            for (const i in tables) {
                if (i) tables = tables.filter((table) => table !== Object.values(rows[i]).pop());
            }
            if (tables.length > 0) this.#Log.exit('Missing tables ' + this.tables.map((table) => table));
        }
        // Check SQLite (this is kinda not very efficient, but I found weird inconsistencies with locking and checking master table)
        if (this.#Type == 'SQLite') {
            const Errors = [];
            for (const i in tables) {
                if (!connection.prepare('SELECT count(*) FROM sqlite_master WHERE type=\'table\' AND name = ?;').get(tables[i])['count(*)']) Errors.push(tables[i]);
            }
            if (Errors.length > 0) this.Log.exit('Missing tables ' + Errors.map((error) => error));
        }
    }
}
export default Database;