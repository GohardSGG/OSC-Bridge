/**
 * This will import the types for JSDoc/Type declarations without
 * impacting the runtime
 * @typedef {import('http').Server|import('https').Server} Server
 */
/**
 * OSC plugin for a Websocket client running in node or browser context
 */
export default class WebsocketServerPlugin extends Plugin {
    /**
     * Create an OSC WebsocketServerPlugin instance with given options.
     * Defaults to *localhost:8080* for the Websocket server
     * @param {object} [options] Custom options
     * @param {string} [options.host='localhost'] Hostname of Websocket server
     * @param {number} [options.port=8080] Port of Websocket server
     * @param {Server} [options.server] Use existing Node.js HTTP/S server
     *
     * @example
     * const plugin = new OSC.WebsocketServerPlugin({ port: 9912 })
     * const osc = new OSC({ plugin: plugin })
     *
     * osc.open() // start server
     * @example <caption>Using an existing HTTP server</caption>
     * const http = require('http')
     * const httpServer = http.createServer();
     * const plugin = new OSC.WebsocketServerPlugin({ server: httpServer })
     * const osc = new OSC({ plugin: plugin })
     */
    constructor(options?: {
        host?: string;
        port?: number;
        server?: Server;
    });
    /**
     * @type {object} options
     * @private
     */
    private options;
    /**
     * @type {object} socket
     * @private
     */
    private socket;
    /**
     * @type {number} socketStatus
     * @private
     */
    private socketStatus;
    /**
     * @type {function} notify
     * @private
     */
    private notify;
    /**
     * Internal method to hook into osc library's
     * EventHandler notify method
     * @param {function} fn Notify callback
     * @private
     */
    private registerNotify;
    /**
     * Start a Websocket server. Defaults to global options
     * @param {object} [customOptions] Custom options
     * @param {string} [customOptions.host] Hostname of Websocket server
     * @param {number} [customOptions.port] Port of Websocket server
     */
    open(customOptions?: {
        host?: string;
        port?: number;
    }): void;
    /**
     * Send an OSC Packet, Bundle or Message to Websocket clients
     * @param {Uint8Array} binary Binary representation of OSC Packet
     */
    send(binary: Uint8Array): void;
}
/**
 * This will import the types for JSDoc/Type declarations without
 * impacting the runtime
 */
export type Server = import('http').Server | import('https').Server;
import Plugin from './plugin';
//# sourceMappingURL=wsserver.d.ts.map