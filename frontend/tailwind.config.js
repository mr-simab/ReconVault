/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core cyber theme colors
        'cyber-black': '#0a0e27',
        'cyber-dark': '#1a1f3a',
        'cyber-darker': '#050818',
        'cyber-light': '#2a2f4a',
        'cyber-lighter': '#3a3f5a',
        'cyber-blue': '#0f3460',
        'cyber-gray': '#888888',
        'cyber-border': '#3a3f5a',
        
        // Neon colors
        'neon-green': '#00ff41',
        'neon-cyan': '#00d9ff',
        'neon-magenta': '#ff006e',
        'neon-purple': '#8f00ff',
        'neon-orange': '#ff6600',
        'danger-red': '#ff0033',
        'warning-yellow': '#ffaa00',
        'safe-green': '#00dd00',
        
        // Legacy compatibility
        'neon-blue': '#00d9ff',
        'neon-pink': '#ff006e',
      },
      fontFamily: {
        'cyber': ['"Orbitron"', 'sans-serif'],
        'mono': ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        'neon': '0 0 10px #00ff41, 0 0 20px #00d9ff',
        'neon-glow': '0 0 5px #00ff41, 0 0 15px #00d9ff, 0 0 30px #8f00ff',
        'glow-green': '0 0 20px rgba(0, 255, 65, 0.5)',
        'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.5)',
        'glow-red': '0 0 20px rgba(255, 0, 51, 0.5)',
        'glow-orange': '0 0 20px rgba(255, 102, 0, 0.5)',
        'glow-yellow': '0 0 20px rgba(255, 170, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'scan-line': 'scan-line 2s linear infinite',
        'neon-flicker': 'neon-flicker 1.5s infinite alternate',
      },
      keyframes: {
        glow: {
          'from': {
            boxShadow: '0 0 10px #00ff41, 0 0 20px #00d9ff',
          },
          'to': {
            boxShadow: '0 0 20px #00ff41, 0 0 40px #00d9ff, 0 0 60px #8f00ff',
          }
        },
        'pulse-neon': {
          '0%, 100%': { 
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor',
            opacity: '1'
          },
          '50%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            opacity: '0.8'
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan-line': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100vw)' },
        },
        'neon-flicker': {
          '0%, 100%': { opacity: '1' },
          '98%': { opacity: '1' },
          '99%': { opacity: '0.8' },
          '99.5%': { opacity: '1' },
          '99.8%': { opacity: '0.9' },
          '100%': { opacity: '1' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
