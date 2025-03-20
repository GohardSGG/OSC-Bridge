export default class Plugin {
    /**
     * Returns the current status of the connection
     * @return {number} Status ID
     */
    status(): number;
    /**
     * Open socket connection. Specifics depend on implementation.
     * @param {object} [customOptions] Custom options. See implementation specifics.
     */
    open(customOptions?: object): void;
    /**
     * Close socket connection and anything else used in the implementation.
     */
    close(): void;
    /**
     * Send an OSC Packet, Bundle or Message. Use options here for
     * custom receiver, otherwise the global options will be taken
     * @param {Uint8Array} binary Binary representation of OSC Packet
     * @param {object} [customOptions] Custom options. Specifics depend on implementation.
     */
    send(binary: Uint8Array, customOptions?: object): void;
}
//# sourceMappingURL=plugin.d.ts.map