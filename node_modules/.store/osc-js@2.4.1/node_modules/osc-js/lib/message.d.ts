/**
 * A TypedMessage consists of an OSC address and an optional array of typed OSC arguments.
 *
 * @typedef {'i'|'f'|'s'|'b'|'h'|'t'|'d'|'T'|'F'|'N'|'I'} MessageArgType
 *
 * - `i` - int32
 * - `f` - float32
 * - `s` - string
 * - `b` - blob
 * - `h` - int64
 * - `t` - uint64
 * - `d` - double
 * - `T` - True (no argument data)
 * - `F` - False (no argument data)
 * - `N` - Nil (no argument data)
 * - `I` - Infinitum (no argument data)
 *
 * @typedef {number|string|Blob|VALUE_TRUE|VALUE_FALSE|VALUE_NONE|VALUE_INFINITY} MessageArgValue
 *
 * @typedef {object} MessageArgObject
 * @property {MessageArgType} type
 * @property {MessageArgValue} value
 *
 * @example
 * const messageArgObject = {
 *   type: 'i', value: 123
 * }
 */
export class TypedMessage {
    /**
     * Create a TypedMessage instance
     * @param {string[]|string} address Address
     * @param {MessageArgValue[]} args Arguments
     *
     * @example
     * const message = new TypedMessage(['test', 'path'])
     * message.add('d', 123.123456789)
     * message.add('s', 'hello')
     *
     * @example
     * const message = new TypedMessage('/test/path', [
     *   { type: 'i', value: 123 },
     *   { type: 'd', value: 123.123 },
     *   { type: 'h', value: 0xFFFFFFn },
     *   { type: 'T', value: null },
     * ])
     */
    constructor(address: string[] | string, args: MessageArgValue[]);
    /**
     * @type {number} offset
     * @private
     */
    private offset;
    /** @type {string} address */
    address: string;
    /** @type {string} types */
    types: string;
    /** @type {MessageArgValue[]} args */
    args: MessageArgValue[];
    /**
     * Add an OSC Atomic Data Type to the list of elements
     * @param {MessageArgType} type
     * @param {MessageArgValue} item
     */
    add(type: MessageArgType, item: MessageArgValue): void;
    /**
     * Interpret the Message as packed binary data
     * @return {Uint8Array} Packed binary data
     */
    pack(): Uint8Array;
    /**
     * Unpack binary data to read a Message
     * @param {DataView} dataView The DataView holding the binary representation of a Message
     * @param {number} [initialOffset=0] Offset of DataView before unpacking
     * @return {number} Offset after unpacking
     */
    unpack(dataView: DataView, initialOffset?: number): number;
}
/**
 * An OSC message consists of an OSC Address Pattern followed
 * by an OSC Type Tag String followed by zero or more OSC Arguments
 */
export default class Message extends TypedMessage {
    /**
     * Create a Message instance
     * @param {string[]|string} address Address
     * @param {...MessageArgValue} args OSC Atomic Data Types
     *
     * @example
     * const message = new Message(['test', 'path'], 50, 100.52, 'test')
     *
     * @example
     * const message = new Message('/test/path', 51.2)
     */
    constructor(address: string[] | string, ...args: MessageArgValue[]);
    /**
     * Add an OSC Atomic Data Type to the list of elements
     * @param {MessageArgValue} item
     */
    add(item: MessageArgValue): void;
}
/**
 * - `i` - int32
 * - `f` - float32
 * - `s` - string
 * - `b` - blob
 * - `h` - int64
 * - `t` - uint64
 * - `d` - double
 * - `T` - True (no argument data)
 * - `F` - False (no argument data)
 * - `N` - Nil (no argument data)
 * - `I` - Infinitum (no argument data)
 */
export type MessageArgType = 'i' | 'f' | 's' | 'b' | 'h' | 't' | 'd' | 'T' | 'F' | 'N' | 'I';
/**
 * A TypedMessage consists of an OSC address and an optional array of typed OSC arguments.
 */
export type MessageArgValue = number | string | Blob | true | false | null | number;
/**
 * A TypedMessage consists of an OSC address and an optional array of typed OSC arguments.
 */
export type MessageArgObject = {
    type: MessageArgType;
    value: MessageArgValue;
};
//# sourceMappingURL=message.d.ts.map