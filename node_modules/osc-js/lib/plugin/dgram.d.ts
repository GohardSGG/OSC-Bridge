/**
 * OSC plugin for simple OSC messaging via udp client
 * and udp server
 */
export default class DatagramPlugin extends Plugin {
    /**
     * Create an OSC Plugin instance with given options. Defaults to
     * localhost:41234 for server and localhost:41235 for client messaging
     * @param {object} [options] Custom options
     * @param {string} [options.type='udp4'] 'udp4' or 'udp6'
     * @param {string} [options.open.host='localhost'] Hostname of udp server to bind to
     * @param {number} [options.open.port=41234] Port of udp server to bind to
     * @param {boolean} [options.open.exclusive=false] Exclusive flag
     * @param {string} [options.send.host='localhost'] Hostname of udp client for messaging
     * @param {number} [options.send.port=41235] Port of udp client for messaging
     *
     * @example
     * const plugin = new OSC.DatagramPlugin({ send: { port: 9912 } })
     * const osc = new OSC({ plugin: plugin })
     */
    constructor(options?: {
        type?: string;
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
    /**
     * Send an OSC Packet, Bundle or Message. Use options here for
     * custom port and hostname, otherwise the global options will
     * be taken
     * @param {Uint8Array} binary Binary representation of OSC Packet
     * @param {object} [customOptions] Custom options for udp socket
     * @param {string} [customOptions.host] Hostname of udp client
     * @param {number} [customOptions.port] Port of udp client
     */
    send(binary: Uint8Array, customOptions?: {
        host?: string;
        port?: number;
    }): void;
}
import Plugin from './plugin';
//# sourceMappingURL=dgram.d.ts.map