/**
 * The database module that the MySQL and SQLite classes will build off of.
 * @module MySQL
 * @requires 'mysql2/promise'
 */

import Driver from 'mysql2/promise';
import Logger from './Logger.js';

/** Main MySQL Class */
class MySQL {
   static Action;
   #Pool;
   #Config;
   static Log;
   static Connection;
   constructor(config) {
      this.#Config = config;
      this.Log = new Logger('MySQL');
      this.#createPool();
      this.Connection = null;
   }

   #createPool() {
      try {
         this.#checkConfig();
         this.#Pool = Driver.createPool(this.#Config);
      } catch (error) {
         this.Log.exit(error);
      } finally {
         this.Log.write('Created new MySQL Pool @ ' + this.#Config.host);
         this.Connection = this.#Pool.getConnection();
      }
   }
   #checkConfig() {
      // Does the config have the defaults still?
      // Does the config have missing required components?
      if (this.#Config.user == 'root') this.Log.write('User is set to root, this is not recommended');
      if (this.#Config.connectionLimit < 20) this.Log.write('Connection limit is below 20, this may cause issues');
      if (!this.#Config.host || !this.#Config.user || !this.#Config.key) this.Log.exit('Missing some required configuration details');
   }
}

export default MySQL;