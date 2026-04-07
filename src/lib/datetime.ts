const LUANDA_TIMEZONE = 'Africa/Luanda';

const getLocale = (language?: string) => (language === 'en' ? 'en-US' : 'pt-PT');

export const formatDate = (value: string | number | Date, language?: string) =>
  new Intl.DateTimeFormat(getLocale(language), {
    timeZone: LUANDA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

export const formatTime = (value: string | number | Date, language?: string) =>
  new Intl.DateTimeFormat(getLocale(language), {
    timeZone: LUANDA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));

export const formatDateTime = (value: string | number | Date, language?: string) =>
  `${formatDate(value, language)} ${formatTime(value, language)}`;

export const LUANDA_TIMEZONE_LABEL = LUANDA_TIMEZONE;

export const getHourInLuanda = (value: string | number | Date) =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: LUANDA_TIMEZONE,
      hour: '2-digit',
      hour12: false,
    }).format(new Date(value)),
  );
