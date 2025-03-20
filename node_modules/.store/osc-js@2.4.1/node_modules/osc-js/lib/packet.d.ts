/**
 * The unit of transmission of OSC is an OSC Packet. The contents
 * of an OSC packet must be either an OSC Message or an OSC Bundle
 */
export default class Packet {
    /**
     * Create a Packet instance holding a Message or Bundle
     * @param {Message|Bundle} [value] Initial Packet value
     */
    constructor(value?: Message | Bundle);
    /** @type {Message|Bundle} value */
    value: Message | Bundle;
    /**
     * @type {number} offset
     * @private
     */
    private offset;
    /**
     * Packs the Packet value. This implementation is more like
     * a wrapper due to OSC specifications, you could also skip the
     * Packet and directly work with the Message or Bundle instance
     * @return {Uint8Array} Packed binary data
     *
     * @example
     * const message = new Message('/test/path', 21.5, 'test')
     * const packet = new Packet(message)
     * const packetBinary = packet.pack() // then send it via udp etc.
     *
     * // or skip the Packet for convenience
     * const messageBinary = message.pack()
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data from DataView to read Messages or Bundles
     * @param {DataView} dataView The DataView holding a binary representation of a Packet
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
import Message from './message';
import Bundle from './bundle';
//# sourceMappingURL=packet.d.ts.map