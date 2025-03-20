/**
 * OSC plugin for setting up communication between a Websocket
 * client and a udp client with a bridge inbetween
 */
export default class BridgePlugin extends Plugin {
    /**
     * Create an OSC Bridge instance with given options. Defaults to
     * localhost:41234 for udp server, localhost:41235 for udp client and
     * localhost:8080 for Websocket server
     * @param {object} [options] Custom options
     * @param {string} [options.udpServer.host='localhost'] Hostname of udp server to bind to
     * @param {number} [options.udpServer.port=41234] Port of udp server to bind to
     * @param {boolean} [options.udpServer.exclusive=false] Exclusive flag
     * @param {string} [options.udpClient.host='localhost'] Hostname of udp client for messaging
     * @param {number} [options.udpClient.port=41235] Port of udp client for messaging
     * @param {string} [options.wsServer.host='localhost'] Hostname of Websocket server
     * @param {number} [options.wsServer.port=8080] Port of Websocket server
     * @param {http.Server|https.Server} [options.wsServer.server] Use existing Node.js HTTP/S server
     * @param {string} [options.receiver='ws'] Where messages sent via 'send' method will be
     * delivered to, 'ws' for Websocket clients, 'udp' for udp client
     *
     * @example
     * const plugin = new OSC.BridgePlugin({ wsServer: { port: 9912 } })
     * const osc = new OSC({ plugin: plugin })
     *
     * @example <caption>Using an existing HTTP server</caption>
     * const http = require('http')
     * const httpServer = http.createServer();
     * const plugin = new OSC.BridgePlugin({ wsServer: { server: httpServer } })
     * const osc = new OSC({ plugin: plugin })
     */
    constructor(options?: object);
    /** @type {object} options
     * @private
     */
    private options;
    /**
     * @type {object} websocket
     * @private
     */
    private websocket;
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
     * Bind a udp socket to a hostname and port
     * @param {object} [customOptions] Custom options
     * @param {string} [customOptions.host='localhost'] Hostname of udp server to bind to
     * @param {number} [customOptions.port=41234] Port of udp server to bind to
     * @param {boolean} [customOptions.exclusive=false] Exclusive flag
     */
    open(customOptions?: {
        host?: string;
        port?: number;
        exclusive?: boolean;
    }): void;
}
import Plugin from './plugin';
//# sourceMappingURL=bridge.d.ts.map