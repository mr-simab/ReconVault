import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";


sessionStorage.clear();
localStorage.clear();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
