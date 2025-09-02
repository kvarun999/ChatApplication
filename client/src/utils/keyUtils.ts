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
  if (!keyBase64 || typeof keyBase64 !== "string" || keyBase64.trim() === "") {
    throw new Error("Missing key in localStorage / invalid key string.");
  }
  try {
    return sodium.from_base64(keyBase64);
  } catch {
    console.error("Invalid Base64 key:", keyBase64);
    throw new Error("Invalid Base64 key.");
  }
};

// Encode Uint8Array → Base64 string (for DB/transport)
export const encodeKey = (keyBytes: Uint8Array): string => {
  return sodium.to_base64(keyBytes);
};
