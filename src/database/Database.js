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
    #Log = new Logger('Database');
    #Errors = []; // on error, store the message, will print at the end
    #Type;
    constructor(type) {
        this.Config = Config.settings[type];
        this.Log = new Logger(type);
        this.#Type = type;
        this.Action = null;
    }
    async check(connection) {
        let tables = ['banned', 'messages', 'rooms', 'userRooms', 'sessions', 'users'];
        if (!this.#Type) this.Log.write('Unable to check for requirements, has it been initalized?');
        else if (this.#Type == 'MySQL') {
            this.#Log.write('Checking MySQL Database for errors...');
            const [rows] = await connection.execute('show tables');
            for (const i in tables) {
                if (i) tables = tables.filter((table) => table !== Object.entries(rows[i])[0][1]);
            }
            if (tables.length > 0) this.#Log.exit('Missing tables ' + this.tables.map((table) => table));
            else this.#Log.write('Checks passed! Good to go.');
        } else if (this.#Type == 'SQLite') {
            this.#Log.write('Checking SQLite Database for errors...');
            for (const i in tables) {
                if (!connection.prepare('SELECT count(*) FROM sqlite_master WHERE type=\'table\' AND name = ?;').get(tables[i])['count(*)']) this.#Errors.push(tables[i]);
            }
            if (this.#Errors.length > 0) this.Log.exit('Missing tables ' + this.#Errors.map((error) => error));
            else this.#Log.write('Checks passed! Good to go.');
        } else this.#Log.write('Unrecognized database model');
    }
}
export default Database;