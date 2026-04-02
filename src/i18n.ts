import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import ptAO from './locales/pt-AO.json';
import enUS from './locales/en-US.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'pt-AO': { translation: ptAO },
      'en-US': { translation: enUS },
    },
    lng: localStorage.getItem('language') || 'pt-AO',
    fallbackLng: 'pt-AO',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
