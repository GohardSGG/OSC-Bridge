/**
 * 8-bit bytes of arbitrary binary data OSC Atomic Data Type
 */
export default class AtomicBlob extends Atomic {
    /**
     * Create an AtomicBlob instance
     * @param {Uint8Array} [value] Binary data
     */
    constructor(value?: Uint8Array);
    /**
     * Interpret the given blob as packed binary data
     * @return {Uint8Array} Packed binary data
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data from DataView and read a blob
     * @param {DataView} dataView The DataView holding the binary representation of the blob
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
import Atomic from '../atomic';
//# sourceMappingURL=blob.d.ts.map