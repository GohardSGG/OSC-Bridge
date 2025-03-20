/**
 * EventHandler to notify listeners on matching OSC messages and
 * status changes of plugins
 */
export default class EventHandler {
    /**
     * Create an EventHandler instance
     * @param {object} options Custom options
     */
    constructor(options: object);
    /**
     * @type {object} options
     * @private
     */
    private options;
    /**
     * @type {array} addressHandlers
     * @private
     */
    private addressHandlers;
    /**
     * @type {object} eventHandlers
     * @private
     */
    private eventHandlers;
    /**
     * @type {number} uuid
     * @private
     */
    private uuid;
    /**
     * Internally used method to dispatch OSC Packets. Extracts
     * given Timetags and dispatches them accordingly
     * @param {Packet} packet
     * @param {*} [rinfo] Remote address info
     * @return {boolean} Success state
     * @private
     */
    private dispatch;
    /**
     * Internally used method to invoke listener callbacks. Uses regular
     * expression pattern matching for OSC addresses
     * @param {string} name OSC address or event name
     * @param {*} [data] The data of the event
     * @param {*} [rinfo] Remote address info
     * @return {boolean} Success state
     * @private
     */
    private call;
    /**
     * Notify the EventHandler of incoming OSC messages or status
     * changes (*open*, *close*, *error*). Handles OSC address patterns
     * and executes timed messages. Use binary arrays when
     * handling directly incoming network data. Packet's or Messages can
     * also be used
     * @param {...*} args
     * The OSC address pattern / event name as string}. For convenience and
     * Plugin API communication you can also use Message or Packet instances
     * or ArrayBuffer, Buffer instances (low-level access). The latter will
     * automatically be unpacked
     * When using a string you can also pass on data as a second argument
     * (any type). All regarding listeners will be notified with this data.
     * As a third argument you can define a javascript timestamp (number or
     * Date instance) for timed notification of the listeners.
     * @return {boolean} Success state of notification
     *
     * @example
     * const socket = dgram.createSocket('udp4')
     * socket.on('message', (message) => {
     *   this.notify(message)
     * })
     *
     * @example
     * this.notify('error', error.message)
     *
     * @example
     * const message = new OSC.Message('/test/path', 55)
     * this.notify(message)
     *
     * @example
     * const message = new OSC.Message('/test/path', 55)
     * // override timestamp
     * this.notify(message.address, message, Date.now() + 5000)
     */
    notify(...args: any[]): boolean;
    /**
     * Subscribe to a new address or event you want to listen to
     * @param {string} name The OSC address or event name
     * @param {function} callback Callback function on notification
     * @return {number} Subscription identifier (needed to unsubscribe)
     */
    on(name: string, callback: Function): number;
    /**
     * Unsubscribe listener from event notification or address handler
     * @param {string} name The OSC address or event name
     * @param {number} subscriptionId Subscription id to identify the handler
     * @return {boolean} Success state
     */
    off(name: string, subscriptionId: number): boolean;
}
//# sourceMappingURL=events.d.ts.map