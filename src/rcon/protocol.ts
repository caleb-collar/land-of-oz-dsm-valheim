/**
 * Source RCON protocol packet encoding and decoding
 *
 * Packet structure:
 * ┌──────────┬──────────┬──────────┬─────────────┬───────┐
 * │ Size(4)  │ ID(4)    │ Type(4)  │ Body(n)     │ Null  │
 * │ int32 LE │ int32 LE │ int32 LE │ ASCII str   │ 0x00  │
 * └──────────┴──────────┴──────────┴─────────────┴───────┘
 */

import type { RconPacket } from "./types.js";

/** Authentication request */
export const SERVERDATA_AUTH = 3;

/** Authentication response */
export const SERVERDATA_AUTH_RESPONSE = 2;

/** Execute command (same value as AUTH_RESPONSE, distinguished by context) */
export const SERVERDATA_EXECCOMMAND = 2;

/** Command response */
export const SERVERDATA_RESPONSE_VALUE = 0;

/** Minimum packet size (id + type + empty body null + trailing null) */
const MIN_PACKET_SIZE = 10;

/** Maximum packet body size */
const MAX_BODY_SIZE = 4096;

/**
 * Encode an RCON packet to a Buffer
 * @param id Packet ID
 * @param type Packet type
 * @param body Packet body string
 * @returns Encoded buffer
 */
export function encodePacket(id: number, type: number, body: string): Buffer {
  const bodyBuffer = Buffer.from(body, "ascii");
  // Size = 4 (id) + 4 (type) + body length + 1 (body null) + 1 (trailing null)
  const size = 4 + 4 + bodyBuffer.length + 2;
  const buffer = Buffer.alloc(4 + size);

  buffer.writeInt32LE(size, 0);
  buffer.writeInt32LE(id, 4);
  buffer.writeInt32LE(type, 8);
  bodyBuffer.copy(buffer, 12);
  // Body null terminator and trailing null are already 0 from alloc

  return buffer;
}

/**
 * Decode an RCON packet from a Buffer
 * @param buffer Buffer containing the packet
 * @returns Decoded packet
 * @throws Error if buffer is too small or malformed
 */
export function decodePacket(buffer: Buffer): RconPacket {
  if (buffer.length < 4) {
    throw new Error("Buffer too small to contain packet size");
  }

  const size = buffer.readInt32LE(0);

  if (size < MIN_PACKET_SIZE) {
    throw new Error(`Invalid packet size: ${size}`);
  }

  if (buffer.length < 4 + size) {
    throw new Error(
      `Buffer too small: expected ${4 + size} bytes, got ${buffer.length}`
    );
  }

  const id = buffer.readInt32LE(4);
  const type = buffer.readInt32LE(8);
  // Body starts at offset 12, ends before the two null terminators
  const bodyEnd = 4 + size - 2;
  const body = buffer.subarray(12, bodyEnd).toString("ascii");

  return { size, id, type, body };
}

/**
 * Check if a buffer contains a complete RCON packet
 * @param buffer Buffer to check
 * @returns True if the buffer contains at least one complete packet
 */
export function hasCompletePacket(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const size = buffer.readInt32LE(0);
  return buffer.length >= 4 + size;
}

/**
 * Validate that a body string is within size limits
 * @param body Body string to validate
 * @returns True if body is within limits
 */
export function isValidBody(body: string): boolean {
  return Buffer.byteLength(body, "ascii") <= MAX_BODY_SIZE;
}
