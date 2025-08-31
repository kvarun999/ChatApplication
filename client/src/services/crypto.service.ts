import sodium from "libsodium-wrappers";
import { decodeKey } from "../utils/keyUtils";

// --- Encryption ---

export const encryptMessage = async (
  message: string,
  recipientPublicKeyBase64: string,
  myPrivateKeyBase64: string
) => {
  await sodium.ready;

  // Decode keys once at boundary
  const recipientPublicKey = decodeKey(recipientPublicKeyBase64);
  const myPrivateKey = decodeKey(myPrivateKeyBase64);

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

  const decryptedBytes = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    senderPublicKey,
    myPrivateKey
  );

  return sodium.to_string(decryptedBytes);
};
