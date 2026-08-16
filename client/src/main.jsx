import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Register service worker with auto-update
// Shows a simple browser confirm to reload when a new version is available
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a toast / confirm when a new app version is cached and ready
    const shouldUpdate = window.confirm(
      "🚀 New version of Buzz Chat is available! Click OK to update."
    );
    if (shouldUpdate) updateSW(true);
  },
  onOfflineReady() {
    console.log("Buzz Chat is ready to work offline!");
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
