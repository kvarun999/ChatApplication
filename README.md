# 🔒 SecureChat: A Real-Time, End-to-End Encrypted Chat Application  

SecureChat is a modern real-time messaging application built with a strong focus on **security** and **privacy**. All communications are **end-to-end encrypted (E2EE)**, ensuring that only the sender and the intended recipient can read the messages.  

The backend acts as a secure relay with **zero knowledge** of message contents — all encryption and decryption happen on the client side.  

---

## ✨ Features  

- 🔐 **End-to-End Encryption (E2EE):** Messages are encrypted using **libsodium** with hybrid encryption (XChaCha20-Poly1305 + Curve25519).  
- 🗝️ **Client-Side Key Generation:** Private keys are generated and stored exclusively on the client device.  
- ⚡ **Real-Time Messaging:** Powered by **Socket.IO** for instant message delivery and seamless real-time communication.  
- 👤 **Secure Authentication:** JWT-based authentication with **Refresh Token Rotation** and httpOnly cookies.  
- 🛠️ **Full Chat Functionality:** User search, one-to-one chat creation, persistent message history, and decrypted previews.  
- 💻 **Modern Tech Stack:** Node.js, Express, MongoDB, Socket.IO, React, TypeScript, Vite, Tailwind CSS, and libsodium-wrappers.  

---

## 🏗️ Technical Architecture  

The app is designed with a **"smart client, dumb server"** philosophy:  

- The backend acts like a secure post office — it stores and relays encrypted messages but cannot read them.  
- The frontend performs all cryptographic operations locally.  

### Backend (Node.js / Express / MongoDB)  
- JWT authentication with access + refresh tokens  
- Socket.IO for real-time WebSocket communication  
- MongoDB with Mongoose for storing users, chat rooms, and encrypted messages  
- REST APIs for auth, user search, and chat management  
- Custom JWT middleware for security  

### Frontend (React / TypeScript / Vite)  
- Curve25519 key pairs generated on registration  
- XChaCha20 encryption/decryption for messages  
- React Context API for auth and sockets  
- Axios with interceptors for token refresh  
- Responsive UI with Tailwind CSS  
- Real-time updates with Socket.IO  

---

## 🚀 Getting Started  

### 1. Clone the repository  
```bash
git clone https://github.com/kvarun999/ChatApplication.git
cd securechat
```

### 2. Backend Setup  
```bash
cd server
npm install
```

Create a `.env` file in `server/` with the following:  
```env
MONGO_URI=mongodb://localhost:27017/chatDB
ACCESS_TOKEN_SECRET=<32-char-secret>
REFRESH_TOKEN_SECRET=<32-char-secret>
```

Run the backend:  
```bash
npm run dev
```

Backend will be available at:  
```
http://localhost:3500
```

### 3. Frontend Setup  
```bash
cd ../client
npm install
npm run dev
```

Frontend will be available at:  
```
http://localhost:5173
```

---

## 🧪 Testing  

1. Open a normal browser → Register/Login as **User A**  
2. Open an Incognito/Private browser → Register/Login as **User B**  
3. Start a new chat and exchange encrypted messages between them  

---

## 🔐 Security Model  

- Server never has access to plaintext messages or private keys  
- Private keys stored locally in the browser (demo purposes)  
- No message recovery if private keys are lost (like Signal)  

⚠️ For production: consider multi-device support and secure key backups.  

---

## 📌 Roadmap  

- Group chat with E2EE  
- Media/file sharing  
- Multi-device support  
- Stronger secure key storage  

---

## 📜 License  

This project is licensed under the **MIT License**.  
