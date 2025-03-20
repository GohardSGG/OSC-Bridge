/** 70 years in seconds */
export const SECONDS_70_YEARS: 2208988800;
/** 2^32 */
export const TWO_POWER_32: 4294967296;
/**
 * Timetag helper class for representing NTP timestamps
 * and conversion between them and javascript representation
 */
export class Timetag {
    /**
     * Create a Timetag instance
     * @param {number} [seconds=0] Initial NTP *seconds* value
     * @param {number} [fractions=0] Initial NTP *fractions* value
     */
    constructor(seconds?: number, fractions?: number);
    /** @type {number} seconds */
    seconds: number;
    /** @type {number} fractions */
    fractions: number;
    /**
     * Converts from NTP to JS representation and back
     * @param {number} [milliseconds] Converts from JS milliseconds to NTP.
     * Leave empty for converting from NTP to JavaScript representation
     * @return {number} Javascript timestamp
     */
    timestamp(milliseconds?: number): number;
}
/**
 * 64-bit big-endian fixed-point time tag, semantics
 * defined below OSC Atomic Data Type
 */
export default class AtomicTimetag extends Atomic {
    /**
     * Create a AtomicTimetag instance
     * @param {number|Timetag|Date} [value] Initial date, leave empty if
     * you want it to be the current date
     */
    constructor(value?: number | Timetag | Date);
    /**
     * Interpret the given timetag as packed binary data
     * @return {Uint8Array} Packed binary data
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data from DataView and read a timetag
     * @param {DataView} dataView The DataView holding the binary representation of the timetag
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
import Atomic from '../atomic';
//# sourceMappingURL=timetag.d.ts.map