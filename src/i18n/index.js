import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import en from './langs/en.json';
import hi from './langs/hi.json';
import ta from './langs/ta.json';
import te from './langs/te.json';
import ml from './langs/ml.json';
import kn from './langs/kn.json';

const translations = {
    en,
    hi,
    ta,
    te,
    ml,
    kn
};

const i18n = new I18n(translations);

// Set default locale
i18n.defaultLocale = 'en';
i18n.locale = getLocales()[0]?.languageCode ?? 'en';
i18n.enableFallback = true;

export default i18n;
