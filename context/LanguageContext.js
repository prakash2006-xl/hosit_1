import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../src/i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [locale, setLocale] = useState(i18n.locale);

    useEffect(() => {
        loadSavedLanguage();
    }, []);

    const loadSavedLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('user_language');
            if (savedLanguage) {
                i18n.locale = savedLanguage;
                setLocale(savedLanguage);
            }
        } catch (error) {
            console.error("Failed to load language:", error);
        }
    };

    const changeLanguage = async (newLocale) => {
        try {
            i18n.locale = newLocale;
            setLocale(newLocale);
            await AsyncStorage.setItem('user_language', newLocale);
        } catch (error) {
            console.error("Failed to save language:", error);
        }
    };

    return (
        <LanguageContext.Provider value={{ locale, changeLanguage, t: i18n.t.bind(i18n) }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
