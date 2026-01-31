/**
 * RCON Protocol Tests
 * Tests for packet encoding/decoding
 */

import { describe, expect, it } from "vitest";
import {
  createAuthPacket,
  createCommandPacket,
  decodePacket,
  encodePacket,
  isAuthFailure,
  isAuthResponse,
  isAuthSuccess,
} from "./protocol.js";
import { RconError, type RconPacket } from "./types.js";

describe("encodePacket", () => {
  it("creates correct packet structure", () => {
    const packet: RconPacket = {
      id: 1,
      type: 2,
      body: "test",
    };

    const encoded = encodePacket(packet);
    const view = new DataView(encoded.buffer);

    // Size = 4 (id) + 4 (type) + 4 (body "test") + 2 (nulls) = 14
    expect(view.getInt32(0, true)).toBe(14); // Size
    expect(view.getInt32(4, true)).toBe(1); // ID
    expect(view.getInt32(8, true)).toBe(2); // Type

    // Body starts at offset 12
    const bodyBytes = encoded.slice(12, 16);
    expect(new TextDecoder().decode(bodyBytes)).toBe("test");

    // Null terminators
    expect(encoded[16]).toBe(0);
    expect(encoded[17]).toBe(0);
  });

  it("handles empty body", () => {
    const packet: RconPacket = {
      id: 42,
      type: 3,
      body: "",
    };

    const encoded = encodePacket(packet);
    const view = new DataView(encoded.buffer);

    // Size = 4 (id) + 4 (type) + 0 (body) + 2 (nulls) = 10
    expect(view.getInt32(0, true)).toBe(10);
    expect(encoded.length).toBe(14); // 4 (size) + 10 (content)
  });

  it("throws on body too large", () => {
    const packet: RconPacket = {
      id: 1,
      type: 2,
      body: "x".repeat(5000), // Exceeds max body size
    };

    expect(() => encodePacket(packet)).toThrow(RconError);
    expect(() => encodePacket(packet)).toThrow("Body too large");
  });

  it("handles special characters", () => {
    const packet: RconPacket = {
      id: 1,
      type: 2,
      body: "kick Player Name with spaces",
    };

    const encoded = encodePacket(packet);
    const result = decodePacket(encoded);

    expect(result!.packet.body).toBe("kick Player Name with spaces");
  });
});

describe("decodePacket", () => {
  it("decodes valid packet", () => {
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

    expect(result).not.toBeNull();
    expect(result!.packet.id).toBe(123);
    expect(result!.packet.type).toBe(0);
    expect(result!.packet.body).toBe("test");
    expect(result!.bytesRead).toBe(18);
  });

  it("returns null for incomplete packet", () => {
    // Only 2 bytes - not enough for size field
    const bytes = new Uint8Array([0x0a, 0x00]);
    const result = decodePacket(bytes);

    expect(result).toBeNull();
  });

  it("returns null when packet not fully received", () => {
    // Size says 14, but only 10 bytes total provided
    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);
    view.setInt32(0, 14, true); // Says we need 18 bytes total

    const result = decodePacket(new Uint8Array(buffer));

    expect(result).toBeNull();
  });

  it("throws on invalid size", () => {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setInt32(0, 5, true); // Invalid - min size is 10

    expect(() => decodePacket(new Uint8Array(buffer))).toThrow(RconError);
    expect(() => decodePacket(new Uint8Array(buffer))).toThrow(
      "Invalid packet size"
    );
  });
});

describe("createAuthPacket", () => {
  it("creates auth packet with password", () => {
    const packet = createAuthPacket(42, "secretpass");
    const view = new DataView(packet.buffer);

    expect(view.getInt32(4, true)).toBe(42); // ID
    expect(view.getInt32(8, true)).toBe(3); // Type: SERVERDATA_AUTH

    // Body should be "secretpass"
    const bodyLength = view.getInt32(0, true) - 10; // size - min_size
    const bodyBytes = packet.slice(12, 12 + bodyLength);
    expect(new TextDecoder().decode(bodyBytes)).toBe("secretpass");
  });
});

describe("createCommandPacket", () => {
  it("creates command packet", () => {
    const packet = createCommandPacket(99, "save");
    const view = new DataView(packet.buffer);

    expect(view.getInt32(4, true)).toBe(99); // ID
    expect(view.getInt32(8, true)).toBe(2); // Type: SERVERDATA_EXECCOMMAND

    // Body should be "save"
    const bodyLength = view.getInt32(0, true) - 10;
    const bodyBytes = packet.slice(12, 12 + bodyLength);
    expect(new TextDecoder().decode(bodyBytes)).toBe("save");
  });
});

describe("isAuthResponse", () => {
  it("identifies auth response", () => {
    expect(isAuthResponse({ id: 1, type: 2, body: "" })).toBe(true);
    expect(isAuthResponse({ id: 1, type: 0, body: "" })).toBe(false);
    expect(isAuthResponse({ id: 1, type: 3, body: "" })).toBe(false);
  });
});

describe("isAuthSuccess", () => {
  it("identifies successful auth", () => {
    // Auth success: type 2, matching ID (not -1)
    expect(isAuthSuccess({ id: 42, type: 2, body: "" }, 42)).toBe(true);

    // Wrong ID
    expect(isAuthSuccess({ id: 42, type: 2, body: "" }, 99)).toBe(false);

    // ID is -1 (auth failure)
    expect(isAuthSuccess({ id: -1, type: 2, body: "" }, -1)).toBe(false);
  });
});

describe("isAuthFailure", () => {
  it("identifies auth failure", () => {
    // Auth failure: type 2, ID is -1
    expect(isAuthFailure({ id: -1, type: 2, body: "" })).toBe(true);

    // Not auth response
    expect(isAuthFailure({ id: -1, type: 0, body: "" })).toBe(false);

    // Auth success (ID not -1)
    expect(isAuthFailure({ id: 42, type: 2, body: "" })).toBe(false);
  });
});

describe("round-trip encode/decode", () => {
  it("preserves packet data", () => {
    const original: RconPacket = {
      id: 12345,
      type: 2,
      body: "Hello, RCON!",
    };

    const encoded = encodePacket(original);
    const result = decodePacket(encoded);

    expect(result).not.toBeNull();
    expect(result!.packet.id).toBe(original.id);
    expect(result!.packet.type).toBe(original.type);
    expect(result!.packet.body).toBe(original.body);
  });
});
