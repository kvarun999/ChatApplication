import sodium from "libsodium-wrappers";

// Initialize libsodium once
export const initializeSodium = async () => {
  await sodium.ready;
};

// --- Key Management ---

// Generate Curve25519 keypair (for asymmetric encryption)
export const generateKeys = async () => {
  await sodium.ready;
  const { publicKey, privateKey } = sodium.crypto_box_keypair();
  return {
    publicKeyBase64: sodium.to_base64(publicKey),
    privateKeyBase64: sodium.to_base64(privateKey),
  };
};

// Decode Base64 → Uint8Array (raw bytes)
export const decodeKey = (keyBase64: string): Uint8Array => {
  return sodium.from_base64(keyBase64);
};

// Encode Uint8Array → Base64 string (for DB/transport)
export const encodeKey = (keyBytes: Uint8Array): string => {
  return sodium.to_base64(keyBytes);
};
