import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

/**
 * Generate a random encryption key
 * @returns {string} Base64 encoded key
 */
export const generateEncryptionKey = () => {
  const key = nacl.randomBytes(nacl.secretbox.keyLength);
  return encodeBase64(key);
};

/**
 * Encrypt data using NaCl
 * @param {string} plaintext - Data to encrypt
 * @param {string} key - Base64 encoded encryption key
 * @returns {string} Base64 encoded nonce:ciphertext
 */
export const encryptData = (plaintext, key) => {
  try {
    const keyBytes = decodeBase64(key);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageBytes = new TextEncoder().encode(plaintext);

    const encrypted = nacl.secretbox(messageBytes, nonce, keyBytes);

    // Combine nonce and ciphertext
    const combined = nacl.util.concatArrays(nonce, encrypted);
    return encodeBase64(combined);
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
};

/**
 * Decrypt data using NaCl
 * @param {string} encryptedData - Base64 encoded nonce:ciphertext
 * @param {string} key - Base64 encoded encryption key
 * @returns {string} Decrypted plaintext
 */
export const decryptData = (encryptedData, key) => {
  try {
    const keyBytes = decodeBase64(key);
    const encryptedBytes = decodeBase64(encryptedData);

    // Extract nonce and ciphertext
    const nonce = encryptedBytes.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = encryptedBytes.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, keyBytes);

    if (!decrypted) {
      throw new Error("Decryption failed - invalid key or corrupted data");
    }

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
};

/**
 * Encrypt file (as bytes)
 * @param {ArrayBuffer} fileBuffer - File data
 * @param {string} key - Base64 encoded encryption key
 * @returns {Blob} Encrypted file blob
 */
export const encryptFile = async (fileBuffer, key) => {
  try {
    const keyBytes = decodeBase64(key);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encrypted = nacl.secretbox(
      new Uint8Array(fileBuffer),
      nonce,
      keyBytes
    );

    // Combine nonce and encrypted data
    const combined = nacl.util.concatArrays(nonce, encrypted);
    return new Blob([combined], { type: "application/octet-stream" });
  } catch (error) {
    console.error("File encryption error:", error);
    throw new Error(`Failed to encrypt file: ${error.message}`);
  }
};

/**
 * Decrypt file (returns ArrayBuffer)
 * @param {Blob} encryptedBlob - Encrypted file blob
 * @param {string} key - Base64 encoded encryption key
 * @returns {Promise<ArrayBuffer>} Decrypted file data
 */
export const decryptFile = async (encryptedBlob, key) => {
  try {
    const keyBytes = decodeBase64(key);
    const encryptedBuffer = await encryptedBlob.arrayBuffer();
    const encryptedBytes = new Uint8Array(encryptedBuffer);

    // Extract nonce and ciphertext
    const nonce = encryptedBytes.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = encryptedBytes.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, keyBytes);

    if (!decrypted) {
      throw new Error("Decryption failed - invalid key or corrupted data");
    }

    return decrypted.buffer;
  } catch (error) {
    console.error("File decryption error:", error);
    throw new Error(`Failed to decrypt file: ${error.message}`);
  }
};
