/**
 * The database module that the SQLite utils will build off of.
 * @module SQLite
 * @requires 'better-sqlite3'
 */

// import Driver from 'better-sqlite3';
import Database from './Database.js';
import SQLite3 from 'better-sqlite3';
import dirname from 'es-dirname';
import Path from 'path';
/** Main SQLite Class */
class SQLite extends Database {
    static Connection;
    constructor() {
        super('SQLite');
        this.Connection = new SQLite3(Path.join(decodeURI(dirname()), '/termtalk.db'), { fileMustExist: true });
        super.check(this.Connection);
    }
}
export default SQLite;