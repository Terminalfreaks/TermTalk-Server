/**
 * The database module that the SQLite utils will build off of.
 * @module SQLite
 * @requires 'better-sqlite3'
 */

// import Driver from 'better-sqlite3';
import Database from './Database.js';

/** Main SQLite Class */
class SQLite extends Database {
    constructor() {
        super('SQLite');
    }
}
export default SQLite;