import sodium from "libsodium-wrappers";
import { decodeKey } from "../utils/keyUtils";

// --- Encryption ---

export const encryptMessage = async (
  message: string,
  recipientPublicKeyBase64: string,
  myPrivateKeyBase64: string
) => {
  await sodium.ready;
  console.log("🔐 Encrypting with:", {
    recipientPublicKeyBase64,
    myPrivateKeyBase64,
  });

  // Decode keys once at boundary
  let recipientPublicKey, myPrivateKey;

  // --- ✅ New Debugging Logic ---
  // We'll check each key individually to find the invalid one.
  try {
    recipientPublicKey = decodeKey(recipientPublicKeyBase64);
  } catch (e) {
    console.error(
      "❌ FAILED TO DECODE RECIPIENT'S PUBLIC KEY. It is not a valid Base64 string.",
      { key: "recipientPublicKeyBase64" }
    );
    throw new Error("Invalid recipient public key format.");
  }
  if (recipientPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error("Recipient public key must be 32 bytes.");
  }

  try {
    myPrivateKey = decodeKey(myPrivateKeyBase64);
  } catch (e) {
    console.error(
      "❌ FAILED TO DECODE YOUR PRIVATE KEY. It is not a valid Base64 string. Try clearing localStorage and logging in again.",
      { key: "myPrivateKeyBase64" }
    );
    throw new Error("Invalid private key format.");
  }

  if (myPrivateKey.length !== sodium.crypto_box_SECRETKEYBYTES) {
    throw new Error("Private key must be 32 bytes.");
  }

  // --- End of Debugging Logic ---

  // Unique random nonce for this message
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

  // Encrypt (message → Uint8Array first)
  const ciphertext = sodium.crypto_box_easy(
    sodium.from_string(message),
    nonce,
    recipientPublicKey,
    myPrivateKey
  );

  return {
    ciphertextBase64: sodium.to_base64(ciphertext),
    nonceBase64: sodium.to_base64(nonce),
  };
};

// --- Decryption ---

export const decryptMessage = async (
  ciphertextBase64: string,
  nonceBase64: string,
  senderPublicKeyBase64: string,
  myPrivateKeyBase64: string
) => {
  await sodium.ready;

  const ciphertext = sodium.from_base64(ciphertextBase64);
  const nonce = sodium.from_base64(nonceBase64);
  const senderPublicKey = decodeKey(senderPublicKeyBase64);
  const myPrivateKey = decodeKey(myPrivateKeyBase64);

  if (senderPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error("Sender public key must be 32 bytes.");
  }
  if (myPrivateKey.length !== sodium.crypto_box_SECRETKEYBYTES) {
    throw new Error("Private key must be 32 bytes.");
  }

  console.log("🔓 Decrypting with:", {
    senderPublicKeyBase64,
    myPrivateKeyBase64,
  });

  try {
    const decryptedBytes = sodium.crypto_box_open_easy(
      ciphertext,
      nonce,
      senderPublicKey,
      myPrivateKey
    );
    return sodium.to_string(decryptedBytes);
  } catch (err) {
    console.error("❌ Decryption failed:", err);
    throw new Error("Failed to decrypt message. Keys or data may be invalid.");
  }
};
