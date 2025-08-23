import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// TypeScript: ensure the element is not null and is the right type
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root container not found");
const root = ReactDOM.createRoot(rootElement); // root is now a Root object

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
