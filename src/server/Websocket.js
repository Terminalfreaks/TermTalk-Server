/**
 * Spawns an HTTP(S) Server alongside the Websocket for transport
 * @module Websocket
 * @requires './Logger'
 * @requires './Webserver'
 */

import Logger from '../util/Logger.js';
import WebSocket from 'ws';
import Webserver from './Webserver.js';
/** Websocket Class */

class Websocket extends Webserver {
    static Log;
    static WS;

    constructor() {
        super();
        this.Log = new Logger('Websocket');
        this.#createWebsocket();
    };
    #createWebsocket() {
        this.WS = new WebSocket.Server({ server: this.Server });
        this.Log.write('Websocket Spawned');
    }
}

export default Websocket;