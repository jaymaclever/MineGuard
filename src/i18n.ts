import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from './locales/pt.json';
import en from './locales/en.json';

export const normalizeLanguage = (value?: string | null) => {
  const raw = (value || '').toLowerCase();

  if (raw.startsWith('pt')) return 'pt';
  if (raw.startsWith('en')) return 'en';

  return 'pt';
};

const initialLanguage = 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    supportedLngs: ['pt', 'en'],
    lng: initialLanguage,
    fallbackLng: 'pt',
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
