/**
 * OSC plugin for a Websocket client running in node or browser context
 */
export default class WebsocketClientPlugin extends Plugin {
    /**
     * Create an OSC WebsocketClientPlugin instance with given options.
     * Defaults to *localhost:8080* for connecting to a Websocket server
     * @param {object} [options] Custom options
     * @param {string} [options.host='localhost'] Hostname of Websocket server
     * @param {number} [options.port=8080] Port of Websocket server
     * @param {boolean} [options.secure=false] Use wss:// for secure connections
     * @param {string|string[]} [options.protocol=''] Subprotocol of Websocket server
     *
     * @example
     * const plugin = new OSC.WebsocketClientPlugin({ port: 9912 })
     * const osc = new OSC({ plugin: plugin })
     */
    constructor(options?: {
        host?: string;
        port?: number;
        secure?: boolean;
        protocol?: string | string[];
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
     * Connect to a Websocket server. Defaults to global options
     * @param {object} [customOptions] Custom options
     * @param {string} [customOptions.host] Hostname of Websocket server
     * @param {number} [customOptions.port] Port of Websocket server
     * @param {boolean} [customOptions.secure] Use wss:// for secure connections
     * @param {string|string[]} [options.protocol] Subprotocol of Websocket server
     */
    open(customOptions?: {
        host?: string;
        port?: number;
        secure?: boolean;
    }): void;
    /**
     * Send an OSC Packet, Bundle or Message to Websocket server
     * @param {Uint8Array} binary Binary representation of OSC Packet
     */
    send(binary: Uint8Array): void;
}
import Plugin from './plugin';
//# sourceMappingURL=wsclient.d.ts.map