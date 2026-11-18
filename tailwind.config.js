/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            DEFAULT: '#0F2A56', // Azul moderno e profundo
            dark: '#091834',    // Azul muito escuro para textos/contraste
            medium: '#1B4284',  // Azul para estados hover e destaques
            light: '#EDF2F9',   // Fundo sutil azulado muito claro
          },
          yellow: {
            DEFAULT: '#F5B700', // Amarelo de acento esportivo
            light: '#FEF7E0',   // Fundo sutil para badges de acento
            dark: '#C99600',
          },
          surface: {
            DEFAULT: '#FFFFFF', // Branco predominante
            muted: '#F7F9FC',   // Cinza muito claro para fundos secundários
            border: '#E5EAF2',  // Bordas discretas
          },
          text: {
            primary: '#0A1629', // Azul muito escuro para textos principais
            secondary: '#5A6A85', // Cinza médio para informações auxiliares
            muted: '#8C9BB0',
          }
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
        montserrat: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(15, 42, 86, 0.065), 0 8px 24px -6px rgba(11, 33, 138, 0.055), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 0 0 1px rgba(11, 33, 138, 0.12), 0 14px 32px -8px rgba(15, 42, 86, 0.11), 0 4px 10px -2px rgba(15, 42, 86, 0.04)',
        'elevated': '0 0 0 1px rgba(15, 42, 86, 0.08), 0 20px 44px -10px rgba(9, 24, 52, 0.22), 0 8px 16px -4px rgba(9, 24, 52, 0.10)',
        'nav': '0 -1px 0 rgba(255, 255, 255, 0.12), 0 -8px 24px rgba(15, 42, 86, 0.08)',
      },
      transitionTimingFunction: {
        'emil-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'emil-quart': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
        'emil-in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'emil-drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('can-hover', '@media (hover: hover) and (pointer: fine)');
    },
  ],
}
