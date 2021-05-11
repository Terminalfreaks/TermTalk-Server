/**
 * The main utility module
 * @module Utili
 */
import Logger from './Logger.js';
import isJSON from './isJSON.js';
import loadEnv from './loadEnv.js';
class Util {
    constructor() {
        this.Log = Logger;
        this.isJSON = isJSON;
        this.loadEnv = loadEnv;
    };
}

export default Util;
