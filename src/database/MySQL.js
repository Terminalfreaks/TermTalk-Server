/**
 * The database module that for MySQL
 * @module MySQL
 * @requires 'mysql2/promise'
 */

import Driver from 'mysql2/promise';
import Database from './Database.js';
/** Main MySQL Class */
class MySQL extends Database {
   static Pool;
   constructor() {
      super('MySQL');
      this.#createPool();
   }
   /**
 * Verifies the MySQL configuration in settings.config.js
 * @access private
 *
 */
   #checkConfig() {
      // Does the config have the defaults still?
      // Does the config have missing required components?
      if (this.Config.user == 'root') this.Log.write('User is set to root, this is not recommended');
      if (this.Config.connectionLimit < 20) this.Log.write('Connection limit is below 20, this may cause issues');
      if (!this.Config.host || !this.Config.user || !this.Config.password) this.Log.exit('Missing some required configuration details');
   }
   /**
     * Creates a new MySQL Connection Pool
     * @access private
     *
     */
   #createPool() {
      this.#checkConfig();
      this.Pool = Driver.createPool(this.Config);
      this.Log.write('Creating a new Connection Pool @ ' + this.Config.host);
      this.#testConnection(); // this will kill the server if a new connection cannot be obtained
      this.check(this.Pool); // confirm the database will work for the version
   }
   /**
  * Tests a new MySQL Connection Pool
  * @access private
  *
  */
   #testConnection() {
      this.Pool.query('SELECT version()').catch((err) => {
         this.Log.exit(err.message);
      });
   }
}

export default MySQL;