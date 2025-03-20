/**
 * Unsigned 64-bit big-endian two's complement integer OSC Atomic Data Type
 */
export default class AtomicUInt64 extends Atomic {
    /**
     * Create an AtomicUInt64 instance
     * @param {number} [value] Initial integer value
     */
    constructor(value?: number);
    /**
     * Interpret the given number as packed binary data
     * @return {Uint8Array} Packed binary data
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data from DataView and read a UInt64 number
     * @param {DataView} dataView The DataView holding the binary representation of the value
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
import Atomic from '../atomic';
//# sourceMappingURL=uint64.d.ts.map