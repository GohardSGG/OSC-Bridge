/** OSC Bundle string */
export const BUNDLE_TAG: "#bundle";
/**
 * An OSC Bundle consist of a Timetag and one or many Bundle Elements.
 * The elements are either OSC Messages or more OSC Bundles
 */
export default class Bundle {
    /**
     * Create a Bundle instance
     * @param {...*} args Timetag and elements. See examples for options
     *
     * @example
     * const bundle = new Bundle(new Date() + 500)
     *
     * @example
     * const message = new Message('/test/path', 51.2)
     * const anotherBundle = new Bundle([message], Date.now() + 1500)
     *
     * @example
     * const message = new Message('/test/path', 51.2)
     * const anotherMessage = new Message('/test/message', 'test', 12)
     * const anotherBundle = new Bundle(message, anotherMessage)
     */
    constructor(...args: any[]);
    /**
     * @type {number} offset
     * @private
     */
    private offset;
    /** @type {AtomicTimetag} timetag */
    timetag: AtomicTimetag;
    /** @type {array} bundleElements */
    bundleElements: any[];
    /**
     * Take a JavaScript timestamp to set the Bundle's timetag
     * @param {number} ms JS timestamp in milliseconds
     *
     * @example
     * const bundle = new Bundle()
     * bundle.timestamp(Date.now() + 5000) // in 5 seconds
     */
    timestamp(ms: number): void;
    /**
     * Add a Message or Bundle to the list of elements
     * @param {Bundle|Message} item
     */
    add(item: Bundle | Message): void;
    /**
     * Interpret the Bundle as packed binary data
     * @return {Uint8Array} Packed binary data
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data to read a Bundle
     * @param {DataView} dataView The DataView holding the binary representation of a Bundle
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
import AtomicTimetag from './atomic/timetag';
import Message from './message';
//# sourceMappingURL=bundle.d.ts.map