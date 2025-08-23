import sodium from "libsodium-wrappers";

// This function must be called once when the app loads
export const initializeSodium = async () => {
  await sodium.ready;
};

// Generates a new key pair and returns them as Base64 strings
export const generateKeys = async () => {
  await sodium.ready;
  const { publicKey, privateKey } = sodium.crypto_box_keypair();
  return {
    publicKeyBase64: sodium.to_base64(publicKey),
    privateKeyBase64: sodium.to_base64(privateKey),
  };
};
