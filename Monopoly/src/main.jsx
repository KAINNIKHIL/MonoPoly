import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
//import "./scripts/uploadCards.js";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: "#111",
            color: "#fff",
            border: "1px solid #333"
          }
        }}
      />
    <App />
  </StrictMode>,
)
