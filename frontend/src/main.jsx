import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { Toaster } from "react-hot-toast";
import "./styles/global.css";
import "./styles/variables.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
    <App />
    <Toaster position="top-right" />
</React.StrictMode>
);