/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/client/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Severity colors
        severity: {
          error: '#ef4444',
          warning: '#eab308',
          info: '#3b82f6',
          hint: '#6b7280',
        },
        // Status colors
        status: {
          discovered: '#8b5cf6',
          approved: '#22c55e',
          ignored: '#6b7280',
        },
        // Dark theme colors
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          text: '#f8fafc',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
