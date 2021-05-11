/**
 * Manages the events emitted by the websocket
 * @module WSManager
 * @requires './ws'
 */

import Websocket from './Websocket.js';
import Logger from '../util/Logger.js';
import isJSON from '../util/isJSON.js';
import fs from 'fs';
import dirname from 'es-dirname';
import Path from 'path';
/** Websocket Manager */

class WSManager extends Websocket {
    static debug;
    static Users;
    static Codes;
    static Methods;
    constructor() {
        super();
        this.Log = new Logger('WSManager');
        this.debug = this.Config.debug;
        this.Codes = ['MESSAGE', 'REFORMAT', 'RECIEVED', 'ACCEPTED', 'REJECTED', 'MALFORMED', 'EXPIRED', 'MISMATCH'];
        this.Methods = this.#getMethods();
        this.WS.on('connection', (socket) => socket.on('message', (msg) => this.run(msg, socket)));
    };
    #getMethods() {
        const tmp = [];
        fs.readdirSync(Path.join(decodeURI(dirname()), './methods/ws/')).forEach((file) => {
            tmp.push(file.split('.')[0].toUpperCase());
        });
        return tmp;
    }
    mutate(socket) {
        socket.respond = ((code, method, content) => {
            const res = {
                ms: Date.now(),
                code: this.Codes.includes(code.toUpperCase()) ? code.toUpperCase() : 'ERROR',
                method: method ? method : null,
                content: content ? {
                    data: content.data ? content.data : null,
                    files: typeof content.files == 'array' ? content.files : null,
                } : null,
            };
            return socket.send(JSON.stringify(res));
        });
    };
    run(msg, socket) {
        this.mutate(socket);
        if (isJSON(msg)) msg = JSON.parse(msg);
        else return socket.respond('REFORMAT', 'ANY');
        //
        if (!msg.method || !this.Methods.includes(msg.method.toUpperCase())) return socket.respond('MALFORMED', 'ANY');
        else {
            (async () => {
                // eslint-disable-next-line new-cap
                await import('./methods/ws/' + msg.method.charAt(0).toUpperCase()+msg.method.toLowerCase().substr(1) + '.js').then((Class) => new Class.default(this, socket));
            }).call();
        }
    }
}

export default WSManager;