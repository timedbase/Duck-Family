import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import App from "./App.jsx";
import { config } from "./chain/client.js";
import "./styles.css";

const queryClient = new QueryClient();

// Amber accent (not the consumer app's lime) -- a small, deliberate visual
// signal that this is the admin tool, not the public site.
const rkTheme = darkTheme({
  accentColor: "#e8a33d",
  accentColorForeground: "#111110",
  borderRadius: "small",
  fontStack: "system",
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rkTheme}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
