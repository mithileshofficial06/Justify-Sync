import { describe, expect, it, beforeAll } from "vitest";
import { encryptField, decryptField } from "./crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-key-only-for-unit-tests";
});

describe("encryptField / decryptField", () => {
  it("round-trips plaintext exactly", () => {
    const plaintext = "The accused was arrested on 15.07.2023.";
    const ciphertext = encryptField(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decryptField(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const a = encryptField("same input");
    const b = encryptField("same input");
    expect(a).not.toBe(b);
  });

  it("rejects a tampered ciphertext rather than silently returning wrong data", () => {
    const ciphertext = encryptField("sensitive fact");
    const [iv, authTag, data] = ciphertext.split(":");
    const tampered = `${iv}:${authTag}:${data.slice(0, -2)}ff`;
    expect(() => decryptField(tampered)).toThrow();
  });

  it("throws a clear error if ENCRYPTION_KEY is missing, rather than silently storing plaintext", () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptField("x")).toThrow(/ENCRYPTION_KEY/);
    process.env.ENCRYPTION_KEY = original;
  });
});
