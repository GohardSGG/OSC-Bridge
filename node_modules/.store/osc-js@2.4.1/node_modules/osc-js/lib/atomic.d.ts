/**
 * Base class for OSC Atomic Data Types
 */
export default class Atomic {
    /**
     * Create an Atomic instance
     * @param {*} [value] Initial value of any type
     */
    constructor(value?: any);
    /** @type {*} value */
    value: any;
    /** @type {number} offset */
    offset: number;
    /**
     * Interpret the given value of this entity as packed binary data
     * @param {string} method The DataView method to write to the ArrayBuffer
     * @param {number} byteLength Size of array in bytes
     * @return {Uint8Array} Packed binary data
     */
    pack(method: string, byteLength: number): Uint8Array;
    /**
     * Unpack binary data from DataView according to the given format
     * @param {DataView} dataView The DataView holding the binary representation of the value
     * @param {string} method The DataView method to read the format from the ArrayBuffer
     * @param {number} byteLength Size of array in bytes
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, method: string, byteLength: number, initialOffset?: number): number;
}
//# sourceMappingURL=atomic.d.ts.map