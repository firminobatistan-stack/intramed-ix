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
        'card': '0 2px 10px rgba(15, 42, 86, 0.05), 0 1px 3px rgba(10, 22, 41, 0.03)',
        'card-hover': '0 10px 25px rgba(15, 42, 86, 0.10), 0 4px 10px rgba(15, 42, 86, 0.04)',
        'elevated': '0 16px 36px rgba(9, 24, 52, 0.22), 0 6px 14px rgba(9, 24, 52, 0.12)',
        'nav': '0 -4px 20px rgba(15, 42, 86, 0.07)',
      }
    },
  },
  plugins: [],
}
