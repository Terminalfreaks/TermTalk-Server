/**
 * The main logging module.
 * @module Logger
 */

import Config from '../configuration/settings.config.js';

/** Logger class. Pretty simple. Contains all the special print out methods. */
class Logger {
    #Title;
    constructor(title) {
        this.#Title = title.charAt(0).toUpperCase() + title.substring(1);
    };
    /**
     * Prints a formatted error.
     * @param {object | string} error
     *
     */
    error(error) {
        if (error.stack && error.message && typeof error.stack === 'string' && typeof error.message === 'string') console.log('[' + new Date().toLocaleDateString() + ' @ ' + new Date().toLocaleTimeString() + ' | Error | ' + this.#Title + ']: ' + error.message + '.');
        else if (typeof error == 'string' || Config.Logger.logUnknownTypes) console.log('[' + new Date().toLocaleDateString() + ' @ ' + new Date().toLocaleTimeString() + ' | ' + this.#Title + ']: ' + error + '.');
        else return; // If it isn't a basic string (assumed manually passed in), or a standard NodeJS Error Object, then don't log it (unless enabled)
    }
    /**
     * Prints a formatted message (non-errorous).
     * @param {string} message
     *
     */
    write(message) {
        console.log('[' + new Date().toLocaleDateString() + ' @ ' + new Date().toLocaleTimeString() + ' | ' + this.#Title + ']: ' + message + '.');
    }
    /**
     * Prints a formatted error, then terminates the process.
     * @param {object | string} error
     *
     */
    exit(error) {
        this.error(error);
        this.error('Exit Error. Closing Server');
        process.exit(0); // No other standard NodeJS exit code available, defaulting to 0.
    }
}

export default Logger;
