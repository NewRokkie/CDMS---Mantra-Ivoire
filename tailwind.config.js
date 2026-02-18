/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette Primaire Olam (30% usage)
        olam: {
          green: '#A0C800',      // Olam Green principal
          dark: '#698714',       // Olam Dark Green pour la profondeur
          black: '#000000',      // Texte primaire
          grey: '#7D7D7D',       // Cool Grey pour diviseurs et bordures
        },
        // Palette d'Accentuation (10% usage)
        accent: {
          teal: '#00869D',       // Statuts informatifs
          orange: '#FD4E00',     // Alertes critiques
          purple: '#760153',     // Éléments secondaires
        },
        // Palette secondaire étendue pour rapports/data
        data: {
          red: '#be3a34',
          brown: '#924c2e',
          navy: '#003594',
          slate: '#253746',
        }
      },
      fontFamily: {
        // Gilroy comme police par défaut pour tout le texte général
        sans: ['"Gilroy-Regular"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        
        // Variantes Gilroy pour titres, labels, navigation, boutons
        'gilroy-light': ['"Gilroy-Light"', 'sans-serif'],
        'gilroy': ['"Gilroy-Regular"', 'sans-serif'],
        'gilroy-medium': ['"Gilroy-Medium"', 'sans-serif'],
        'gilroy-bold': ['"Gilroy-Bold"', 'sans-serif'],
        'gilroy-heavy': ['"Gilroy-Heavy"', 'sans-serif'],
        
        // Helvetica Neue pour chiffres, données numériques, tableaux
        'numeric': ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        'helvetica': ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        
        // Marianina Wide pour les grands titres (Tracking 0 pour Web UI)
        'heading': ['"Marianina Wide FY"', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        // Marianina nécessite souvent un tracking serré (-20), sauf en Web UI
        tightest: '-0.05em',
        olam: '0',
      },
      boxShadow: {
        // Effet "Soft UI Evolution" recommandé pour les widgets CDMS
        'soft': '0 4px 6px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 10px 15px rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        // Variables d'espacement standardisées pour le skill
        'widget': '16px',
        'section': '24px',
      },
      borderRadius: {
        'olam': '12px', // Pour les cartes Bento Box et les widgets
      },
      transitionDuration: {
        'olam': '250ms', // Entre 200ms et 300ms selon les règles
      }
    },
  },
  plugins: [
    // Plugins recommandés pour les formulaires multi-étapes et rapports
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ]
};
