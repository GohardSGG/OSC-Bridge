/**
 * 64-bit big-endian IEEE 754 floating point number OSC Atomic Data Type
 */
export default class AtomicFloat64 extends Atomic {
    /**
     * Create an AtomicFloat64 instance
     * @param {number} [value] Float number
     */
    constructor(value?: number);
    /**
     * Interpret the given number as packed binary data
     * @return {Uint8Array} Packed binary data
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data from DataView and read a Float64 number
     * @param {DataView} dataView The DataView holding the binary representation of the value
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
import Atomic from '../atomic';
//# sourceMappingURL=float64.d.ts.map