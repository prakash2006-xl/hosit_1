import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const languages = [
    { label: 'English', value: 'en', icon: '🌐', char: 'EN' },
    { label: 'Hindi (हिंदी)', value: 'hi', icon: '🇮🇳', char: 'अ' },
    { label: 'Tamil (தமிழ்)', value: 'ta', icon: '🇮🇳', char: 'அ' },
    { label: 'Telugu (తెలుగు)', value: 'te', icon: '🇮🇳', char: 'అ' },
    { label: 'Malayalam (മലയാളം)', value: 'ml', icon: '🇮🇳', char: 'അ' },
    { label: 'Kannada (ಕನ್ನಡ)', value: 'kn', icon: '🇮🇳', char: 'ಅ' },
];

// Note: Using unique script characters for each language
const languageIcons = {
    en: { char: 'A', color: '#4CAF50' },
    hi: { char: 'अ', color: '#FF9800' },
    ta: { char: 'அ', color: '#E91E63' },
    te: { char: 'అ', color: '#2196F3' },
    ml: { char: 'അ', color: '#9C27B0' },
    kn: { char: 'ಅ', color: '#FF5722' },
};

export default function LanguageSwitcher() {
    const { locale, changeLanguage } = useLanguage();
    const [modalVisible, setModalVisible] = useState(false);

    const selectedLang = languages.find(l => l.value === locale) || languages[0];

    const handleSelect = (langValue) => {
        changeLanguage(langValue);
        setModalVisible(false);
    };

    return (
        <View>
            <TouchableOpacity
                style={styles.container}
                onPress={() => setModalVisible(true)}
            >
                <View style={[styles.iconCircle, { backgroundColor: languageIcons[locale]?.color || '#FFF' }]}>
                    <Text style={styles.iconChar}>{languageIcons[locale]?.char || 'A'}</Text>
                </View>
                <Text style={styles.selectedLabel} numberOfLines={1}>
                    {selectedLang.value.toUpperCase()}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Language</Text>
                        <FlatList
                            data={languages}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.langItem,
                                        locale === item.value && styles.activeLangItem
                                    ]}
                                    onPress={() => handleSelect(item.value)}
                                >
                                    <View style={[styles.itemIconCircle, { backgroundColor: languageIcons[item.value].color }]}>
                                        <Text style={styles.itemIconChar}>{languageIcons[item.value].char}</Text>
                                    </View>
                                    <Text style={[
                                        styles.langLabel,
                                        locale === item.value && styles.activeLangLabel
                                    ]}>
                                        {item.label}
                                    </Text>
                                    {locale === item.value && (
                                        <MaterialIcons name="check" size={20} color="#2196F3" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginRight: 10,
        minWidth: 80, // Reduced from 100
        height: 40,   // Reduced from 45
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        paddingHorizontal: 8,
        gap: 5,
    },
    iconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconChar: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    selectedLabel: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        maxHeight: '60%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    langItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 15,
    },
    activeLangItem: {
        backgroundColor: '#E3F2FD',
    },
    itemIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemIconChar: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    langLabel: {
        flex: 1,
        fontSize: 16,
        color: '#444',
    },
    activeLangLabel: {
        color: '#1E88E5',
        fontWeight: 'bold',
    },
});
