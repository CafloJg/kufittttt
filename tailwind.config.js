/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      height: {
        screen: ['100vh', '100dvh'],
      },
      minHeight: {
        screen: ['100vh', '100dvh'],
      },
      screens: {
        'xs': '320px',
        'sm': '428px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      colors: {
        primary: {
          50: '#FEF1FA',
          100: '#FDE4F6',
          200: '#FBC9ED',
          300: '#F9AEE4',
          400: '#F793DB',
          500: '#F840BA',
          600: '#F733B5',
          700: '#F626AF',
          800: '#F519A9',
          900: '#F30C9E'
        },
        secondary: {
          50: '#FDF6F3',
          100: '#FCEDE7',
          200: '#F9DBCF',
          300: '#F5C9B7',
          400: '#F2B79F',
          500: '#EE8B60',
          600: '#EC7E4F',
          700: '#EA713E',
          800: '#E8642D',
          900: '#E6571C'
        }
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Comfortaa', 'cursive'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderWidth: {
        '10': '10px',
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
      },
      touchAction: {
        'manipulation': 'manipulation',
      },
      userSelect: {
        'none': 'none',
      },
      boxShadow: {
        'inner-lg': 'inset 0 2px 6px 0 rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class'
    }),
    function({ addUtilities }) {
      addUtilities({
        '.touch-callout-none': {
          '-webkit-touch-callout': 'none',
        },
        '.tap-highlight-transparent': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.overscroll-none': {
          'overscroll-behavior': 'none',
        },
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.user-select-none': {
          'user-select': 'none',
          '-webkit-user-select': 'none',
        },
        '.safe-top': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.safe-left': {
          'padding-left': 'env(safe-area-inset-left)',
        },
        '.safe-right': {
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.safe-area-inset': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.tap-highlight-transparent': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.touch-callout-none': {
          '-webkit-touch-callout': 'none',
        },
        '.momentum-scroll': {
          '-webkit-overflow-scrolling': 'touch',
        },
        '.prevent-zoom': {
          'touch-action': 'pan-x pan-y',
        },
        '.prevent-overscroll': {
          'overscroll-behavior': 'none',
        },
        '.text-size-adjust-none': {
          '-webkit-text-size-adjust': 'none',
          'text-size-adjust': 'none',
        },
        '.content-visibility-auto': {
          'content-visibility': 'auto',
        },
        '.backface-visibility-hidden': {
          'backface-visibility': 'hidden',
          '-webkit-backface-visibility': 'hidden',
        },
        '.will-change-transform': {
          'will-change': 'transform',
        },
        '.hardware-accelerated': {
          'transform': 'translateZ(0)',
        },
      })
    }
  ],
};