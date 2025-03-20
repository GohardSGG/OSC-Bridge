/**
 * 32-bit big-endian two's complement integer OSC Atomic Data Type
 */
export default class AtomicInt32 extends Atomic {
    /**
     * Create an AtomicInt32 instance
     * @param {number} [value] Initial integer value
     */
    constructor(value?: number);
    /**
     * Interpret the given number as packed binary data
     * @return {Uint8Array} Packed binary data
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data from DataView and read a Int32 number
     * @param {DataView} dataView The DataView holding the binary representation of the value
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
import Atomic from '../atomic';
//# sourceMappingURL=int32.d.ts.map