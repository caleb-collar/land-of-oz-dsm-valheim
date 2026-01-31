/**
 * RCON Protocol Tests
 * Tests for packet encoding/decoding
 */

import { assertEquals, assertThrows } from "@std/assert";
import {
  createAuthPacket,
  createCommandPacket,
  decodePacket,
  encodePacket,
  isAuthFailure,
  isAuthResponse,
  isAuthSuccess,
} from "./protocol.ts";
import { RconError, type RconPacket } from "./types.ts";

Deno.test("encodePacket - creates correct packet structure", () => {
  const packet: RconPacket = {
    id: 1,
    type: 2,
    body: "test",
  };

  const encoded = encodePacket(packet);
  const view = new DataView(encoded.buffer);

  // Size = 4 (id) + 4 (type) + 4 (body "test") + 2 (nulls) = 14
  assertEquals(view.getInt32(0, true), 14); // Size
  assertEquals(view.getInt32(4, true), 1); // ID
  assertEquals(view.getInt32(8, true), 2); // Type

  // Body starts at offset 12
  const bodyBytes = encoded.slice(12, 16);
  assertEquals(new TextDecoder().decode(bodyBytes), "test");

  // Null terminators
  assertEquals(encoded[16], 0);
  assertEquals(encoded[17], 0);
});

Deno.test("encodePacket - handles empty body", () => {
  const packet: RconPacket = {
    id: 42,
    type: 3,
    body: "",
  };

  const encoded = encodePacket(packet);
  const view = new DataView(encoded.buffer);

  // Size = 4 (id) + 4 (type) + 0 (body) + 2 (nulls) = 10
  assertEquals(view.getInt32(0, true), 10);
  assertEquals(encoded.length, 14); // 4 (size) + 10 (content)
});

Deno.test("encodePacket - throws on body too large", () => {
  const packet: RconPacket = {
    id: 1,
    type: 2,
    body: "x".repeat(5000), // Exceeds max body size
  };

  assertThrows(() => encodePacket(packet), RconError, "Body too large");
});

Deno.test("decodePacket - decodes valid packet", () => {
  // Create a valid packet manually
  const buffer = new ArrayBuffer(18); // 4 + 14 (size 14 packet)
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setInt32(0, 14, true); // Size
  view.setInt32(4, 123, true); // ID
  view.setInt32(8, 0, true); // Type (RESPONSE_VALUE)

  // Body "test"
  const bodyBytes = new TextEncoder().encode("test");
  bytes.set(bodyBytes, 12);
  // Null terminators at 16, 17 (already 0)

  const result = decodePacket(bytes);

  assertEquals(result !== null, true);
  assertEquals(result!.packet.id, 123);
  assertEquals(result!.packet.type, 0);
  assertEquals(result!.packet.body, "test");
  assertEquals(result!.bytesRead, 18);
});

Deno.test("decodePacket - returns null for incomplete packet", () => {
  // Only 2 bytes - not enough for size field
  const bytes = new Uint8Array([0x0a, 0x00]);
  const result = decodePacket(bytes);

  assertEquals(result, null);
});

Deno.test("decodePacket - returns null when packet not fully received", () => {
  // Size says 14, but only 10 bytes total provided
  const buffer = new ArrayBuffer(10);
  const view = new DataView(buffer);
  view.setInt32(0, 14, true); // Says we need 18 bytes total

  const result = decodePacket(new Uint8Array(buffer));

  assertEquals(result, null);
});

Deno.test("decodePacket - throws on invalid size", () => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setInt32(0, 5, true); // Invalid - min size is 10

  assertThrows(
    () => decodePacket(new Uint8Array(buffer)),
    RconError,
    "Invalid packet size",
  );
});

Deno.test("createAuthPacket - creates auth packet with password", () => {
  const packet = createAuthPacket(42, "secretpass");
  const view = new DataView(packet.buffer);

  assertEquals(view.getInt32(4, true), 42); // ID
  assertEquals(view.getInt32(8, true), 3); // Type: SERVERDATA_AUTH

  // Body should be "secretpass"
  const bodyLength = view.getInt32(0, true) - 10; // size - min_size
  const bodyBytes = packet.slice(12, 12 + bodyLength);
  assertEquals(new TextDecoder().decode(bodyBytes), "secretpass");
});

Deno.test("createCommandPacket - creates command packet", () => {
  const packet = createCommandPacket(99, "save");
  const view = new DataView(packet.buffer);

  assertEquals(view.getInt32(4, true), 99); // ID
  assertEquals(view.getInt32(8, true), 2); // Type: SERVERDATA_EXECCOMMAND

  // Body should be "save"
  const bodyLength = view.getInt32(0, true) - 10;
  const bodyBytes = packet.slice(12, 12 + bodyLength);
  assertEquals(new TextDecoder().decode(bodyBytes), "save");
});

Deno.test("isAuthResponse - identifies auth response", () => {
  assertEquals(isAuthResponse({ id: 1, type: 2, body: "" }), true);
  assertEquals(isAuthResponse({ id: 1, type: 0, body: "" }), false);
  assertEquals(isAuthResponse({ id: 1, type: 3, body: "" }), false);
});

Deno.test("isAuthSuccess - identifies successful auth", () => {
  // Auth success: type 2, matching ID (not -1)
  assertEquals(isAuthSuccess({ id: 42, type: 2, body: "" }, 42), true);

  // Wrong ID
  assertEquals(isAuthSuccess({ id: 42, type: 2, body: "" }, 99), false);

  // ID is -1 (auth failure)
  assertEquals(isAuthSuccess({ id: -1, type: 2, body: "" }, -1), false);
});

Deno.test("isAuthFailure - identifies auth failure", () => {
  // Auth failure: type 2, ID is -1
  assertEquals(isAuthFailure({ id: -1, type: 2, body: "" }), true);

  // Not auth response
  assertEquals(isAuthFailure({ id: -1, type: 0, body: "" }), false);

  // Auth success (ID not -1)
  assertEquals(isAuthFailure({ id: 42, type: 2, body: "" }), false);
});

Deno.test("round-trip encode/decode", () => {
  const original: RconPacket = {
    id: 12345,
    type: 2,
    body: "Hello, RCON!",
  };

  const encoded = encodePacket(original);
  const result = decodePacket(encoded);

  assertEquals(result !== null, true);
  assertEquals(result!.packet.id, original.id);
  assertEquals(result!.packet.type, original.type);
  assertEquals(result!.packet.body, original.body);
});

Deno.test("encodePacket - handles special characters", () => {
  const packet: RconPacket = {
    id: 1,
    type: 2,
    body: "kick Player Name with spaces",
  };

  const encoded = encodePacket(packet);
  const result = decodePacket(encoded);

  assertEquals(result!.packet.body, "kick Player Name with spaces");
});
