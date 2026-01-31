/**
 * Source RCON Protocol Implementation
 *
 * Packet structure:
 * ┌──────────┬──────────┬──────────┬─────────────┬───────┐
 * │ Size(4)  │ ID(4)    │ Type(4)  │ Body(n)     │ Null  │
 * │ int32 LE │ int32 LE │ int32 LE │ ASCII str   │ 0x00  │
 * └──────────┴──────────┴──────────┴─────────────┴───────┘
 *
 * Size = ID(4) + Type(4) + Body(n) + Null(1) + Null(1) = 10 + body.length
 * The size field does not include itself.
 */

import { type PacketType, RconError, type RconPacket } from "./types.ts";

/** Minimum packet size (ID + Type + 2 null terminators) */
const MIN_PACKET_SIZE = 10;

/** Maximum packet body size */
const MAX_BODY_SIZE = 4096;

/** Header size (Size + ID + Type) */
const HEADER_SIZE = 12;

/**
 * Encode an RCON packet to bytes
 */
export function encodePacket(packet: RconPacket): Uint8Array {
  const bodyBytes = new TextEncoder().encode(packet.body);

  if (bodyBytes.length > MAX_BODY_SIZE) {
    throw new RconError(
      "PROTOCOL_ERROR",
      `Body too large: ${bodyBytes.length} > ${MAX_BODY_SIZE}`,
    );
  }

  // Size = ID(4) + Type(4) + Body(n) + Null(1) + Null(1)
  const size = 4 + 4 + bodyBytes.length + 2;
  const totalLength = 4 + size; // Size field + packet content

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Write header (little-endian)
  view.setInt32(0, size, true); // Size
  view.setInt32(4, packet.id, true); // ID
  view.setInt32(8, packet.type, true); // Type

  // Write body
  bytes.set(bodyBytes, HEADER_SIZE);

  // Null terminators are already 0 from ArrayBuffer initialization
  // Position: HEADER_SIZE + bodyBytes.length and +1

  return bytes;
}

/**
 * Decode an RCON packet from bytes.
 * Returns the packet and the number of bytes consumed.
 */
export function decodePacket(
  data: Uint8Array,
): { packet: RconPacket; bytesRead: number } | null {
  // Need at least 4 bytes to read size
  if (data.length < 4) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const size = view.getInt32(0, true);

  // Validate size
  if (size < MIN_PACKET_SIZE) {
    throw new RconError("PROTOCOL_ERROR", `Invalid packet size: ${size}`);
  }

  const totalLength = 4 + size;

  // Check if we have the complete packet
  if (data.length < totalLength) {
    return null;
  }

  // Read header
  const id = view.getInt32(4, true);
  const type = view.getInt32(8, true) as PacketType;

  // Read body (excluding null terminators)
  const bodyLength = size - MIN_PACKET_SIZE;
  const bodyBytes = data.slice(HEADER_SIZE, HEADER_SIZE + bodyLength);
  const body = new TextDecoder().decode(bodyBytes);

  return {
    packet: { id, type, body },
    bytesRead: totalLength,
  };
}

/**
 * Create an authentication packet
 */
export function createAuthPacket(id: number, password: string): Uint8Array {
  return encodePacket({
    id,
    type: 3, // SERVERDATA_AUTH
    body: password,
  });
}

/**
 * Create a command packet
 */
export function createCommandPacket(id: number, command: string): Uint8Array {
  return encodePacket({
    id,
    type: 2, // SERVERDATA_EXECCOMMAND
    body: command,
  });
}

/**
 * Check if a packet is an auth response
 */
export function isAuthResponse(packet: RconPacket): boolean {
  return packet.type === 2; // SERVERDATA_AUTH_RESPONSE
}

/**
 * Check if auth was successful (ID matches, not -1)
 */
export function isAuthSuccess(packet: RconPacket, requestId: number): boolean {
  return isAuthResponse(packet) && packet.id === requestId && packet.id !== -1;
}

/**
 * Check if auth failed (ID is -1)
 */
export function isAuthFailure(packet: RconPacket): boolean {
  return isAuthResponse(packet) && packet.id === -1;
}
