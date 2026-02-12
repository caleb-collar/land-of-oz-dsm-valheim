/**
 * Tests for Source RCON protocol encoding/decoding
 */

import { describe, expect, it } from "vitest";
import {
  decodePacket,
  encodePacket,
  hasCompletePacket,
  isValidBody,
  SERVERDATA_AUTH,
  SERVERDATA_EXECCOMMAND,
  SERVERDATA_RESPONSE_VALUE,
} from "./protocol.js";

describe("RCON Protocol", () => {
  describe("encodePacket", () => {
    it("should encode a basic packet", () => {
      const buffer = encodePacket(1, SERVERDATA_EXECCOMMAND, "test");
      expect(buffer).toBeInstanceOf(Buffer);

      // Size field: 4 (id) + 4 (type) + 4 (body "test") + 2 (nulls) = 14
      const size = buffer.readInt32LE(0);
      expect(size).toBe(14);

      // ID
      expect(buffer.readInt32LE(4)).toBe(1);

      // Type
      expect(buffer.readInt32LE(8)).toBe(SERVERDATA_EXECCOMMAND);
    });

    it("should encode an empty body", () => {
      const buffer = encodePacket(0, SERVERDATA_AUTH, "");
      const size = buffer.readInt32LE(0);
      // 4 (id) + 4 (type) + 0 (body) + 2 (nulls) = 10
      expect(size).toBe(10);
    });

    it("should encode auth packets", () => {
      const buffer = encodePacket(42, SERVERDATA_AUTH, "password123");
      expect(buffer.readInt32LE(4)).toBe(42);
      expect(buffer.readInt32LE(8)).toBe(SERVERDATA_AUTH);
    });
  });

  describe("decodePacket", () => {
    it("should decode an encoded packet (round-trip)", () => {
      const original = encodePacket(5, SERVERDATA_RESPONSE_VALUE, "hello");
      const decoded = decodePacket(original);

      expect(decoded.id).toBe(5);
      expect(decoded.type).toBe(SERVERDATA_RESPONSE_VALUE);
      expect(decoded.body).toBe("hello");
    });

    it("should decode an empty body packet", () => {
      const original = encodePacket(0, SERVERDATA_AUTH, "");
      const decoded = decodePacket(original);

      expect(decoded.id).toBe(0);
      expect(decoded.type).toBe(SERVERDATA_AUTH);
      expect(decoded.body).toBe("");
    });

    it("should throw on buffer too small", () => {
      expect(() => decodePacket(Buffer.alloc(2))).toThrow("Buffer too small");
    });

    it("should throw on invalid packet size", () => {
      const buffer = Buffer.alloc(8);
      buffer.writeInt32LE(2, 0); // size = 2, less than minimum 10
      expect(() => decodePacket(buffer)).toThrow("Invalid packet size");
    });

    it("should throw when buffer shorter than declared size", () => {
      const buffer = Buffer.alloc(8);
      buffer.writeInt32LE(100, 0); // Declared size larger than buffer
      expect(() => decodePacket(buffer)).toThrow("Buffer too small");
    });
  });

  describe("hasCompletePacket", () => {
    it("should return false for empty buffer", () => {
      expect(hasCompletePacket(Buffer.alloc(0))).toBe(false);
    });

    it("should return false for buffer too small for size field", () => {
      expect(hasCompletePacket(Buffer.alloc(3))).toBe(false);
    });

    it("should return false for incomplete packet", () => {
      const buffer = Buffer.alloc(8);
      buffer.writeInt32LE(20, 0); // Says 20 bytes but buffer only has 8
      expect(hasCompletePacket(buffer)).toBe(false);
    });

    it("should return true for complete packet", () => {
      const packet = encodePacket(1, SERVERDATA_EXECCOMMAND, "test");
      expect(hasCompletePacket(packet)).toBe(true);
    });
  });

  describe("isValidBody", () => {
    it("should accept a normal string", () => {
      expect(isValidBody("hello world")).toBe(true);
    });

    it("should accept an empty string", () => {
      expect(isValidBody("")).toBe(true);
    });

    it("should reject an oversized string", () => {
      const huge = "a".repeat(5000);
      expect(isValidBody(huge)).toBe(false);
    });
  });
});
