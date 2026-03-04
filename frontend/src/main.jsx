// ReconVault Frontend Entry Point
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/main.css'

// Main application entry point
const root = ReactDOM.createRoot(document.getElementById('root'))

// Hide loading screen when app is ready
const loadingScreen = document.getElementById('loading-screen')

// Check if we're running in development mode
const isDev = import.meta.env.DEV

console.log('ReconVault Frontend v0.1.0')
console.log(`Running in ${isDev ? 'development' : 'production'} mode`)

// Render the application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Hide loading screen after a short delay to ensure smooth transition
setTimeout(() => {
  if (loadingScreen) {
    loadingScreen.style.opacity = '0'
    loadingScreen.style.transition = 'opacity 0.5s ease-out'
    setTimeout(() => {
      loadingScreen.style.display = 'none'
    }, 500)
  }
}, 1000)
