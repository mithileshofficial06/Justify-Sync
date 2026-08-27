import crypto from "crypto";

/**
 * v5 §5.5: "Field-level encryption at rest for extracted personal facts
 * (name matches, prior-conviction status) in PostgreSQL." Not implemented
 * before this — ExtractedFact.value/sourceSentence were plaintext.
 *
 * AES-256-GCM, key derived from ENCRYPTION_KEY via SHA-256 so any string
 * the deployer sets works as a key (avoids the common footgun of needing
 * an exact 32-byte value). Ciphertext is stored as "iv:authTag:data", all
 * hex — self-contained, no separate column needed for the IV.
 */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not set — required to store/read extracted personal facts.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptField(ciphertext: string): string {
  const [ivHex, authTagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted field — expected iv:authTag:data.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
