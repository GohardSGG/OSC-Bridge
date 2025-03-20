/**
 * Checks type of given object and returns the regarding OSC
 * Type tag character
 * @param {*} item Any object
 * @return {string} OSC Type tag character
 */
export function typeTag(item: any): string;
/**
 * Sanitizes an OSC-ready Address Pattern
 * @param {string[]|string} obj Address as string or array of strings
 * @return {string} Corrected address string
 *
 * @example
 * // all calls return '/test/path' string:
 * prepareAddress('test/path')
 * prepareAddress('/test/path/')
 * prepareAddress([test, path])
 */
export function prepareAddress(obj: string[] | string): string;
/**
 * Make an OSC address pattern javascript-regex-ready
 * @param {string} str OSC address pattern
 * @return {string} Javascript RegEx string
 */
export function prepareRegExPattern(str: string): string;
/**
 * Holds a list of items and helps to merge them
 * into a single array of packed binary data
 */
export default class EncodeHelper {
    /** @type {array} data */
    data: any[];
    /** @type {number} byteLength */
    byteLength: number;
    /**
     * Packs an item and adds it to the list
     * @param {*} item Any object
     * @return {EncodeHelper}
     */
    add(item: any): EncodeHelper;
    /**
     * Merge all added items into one Uint8Array
     * @return {Uint8Array} Merged binary data array of all items
     */
    merge(): Uint8Array;
}
//# sourceMappingURL=helpers.d.ts.map