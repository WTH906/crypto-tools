/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Matt dark palette with green tint
        bg: {
          DEFAULT: '#0a0f0d',
          surface: '#111613',
          elevated: '#1a201c',
          hover: '#1f2823'
        },
        border: {
          DEFAULT: '#1f2a23',
          strong: '#2a3830',
          accent: '#15803d'
        },
        fg: {
          DEFAULT: '#e5e9e6',
          muted: '#8a958e',
          subtle: '#5a655e'
        },
        accent: {
          DEFAULT: '#4ade80',
          muted: '#22c55e',
          dark: '#15803d',
          bg: '#052e16',
          glow: '#4ade8033'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        'green-glow': '0 0 0 1px rgba(74, 222, 128, 0.3), 0 4px 24px -8px rgba(74, 222, 128, 0.2)',
        'inner-line': 'inset 0 1px 0 rgba(255,255,255,0.04)'
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
