import api from "../lib/axios";
import { generateKeys } from "../utils/keyUtils";

// Define the shape of the registration data
interface RegistrationData {
  username: string;
  email: string;
  password: string;
}

export const registerUser = async (data: RegistrationData) => {
  // 1. Generate the cryptographic keys on the client
  const { publicKeyBase64, privateKeyBase64 } = await generateKeys();

  // 2. Securely store the private key in localStorage
  localStorage.setItem("privateKey", privateKeyBase64);

  // 3. Call the backend API with the user data and the public key
  const response = await api.post("/api/auth/register", {
    username: data.username,
    email: data.email,
    password: data.password,
    publicKey: publicKeyBase64,
  });

  // 4. Return the server's response (which includes the accessToken)
  return response.data;
};

interface loginData {
  email: string;
  password: string;
}

export const loginUser = async (data: loginData) => {
  const res = await api.post("api/auth/login", data);

  const privateKey = localStorage.getItem("privateKey");
  if (!privateKey) {
    throw new Error(
      "don't fucking use another device. BITCH!. use the one you registered with"
    );
  }

  return res.data;
};
