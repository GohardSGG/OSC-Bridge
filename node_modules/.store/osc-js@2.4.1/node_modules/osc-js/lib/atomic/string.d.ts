/**
 * A sequence of non-null ASCII characters OSC Atomic Data Type
 */
export default class AtomicString extends Atomic {
    /**
     * Create an AtomicString instance
     * @param {string} [value] Initial string value
     */
    constructor(value?: string);
    /**
     * Interpret the given string as packed binary data
     * @return {Uint8Array} Packed binary data
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data from DataView and read a string
     * @param {DataView} dataView The DataView holding the binary representation of the string
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
import Atomic from '../atomic';
//# sourceMappingURL=string.d.ts.map