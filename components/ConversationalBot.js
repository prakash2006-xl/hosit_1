import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { API_URL } from '../constants/config';

export default function ConversationalBot() {
    const router = useRouter();
    const [messages, setMessages] = useState([
        { id: 1, text: "Hello, I am Hosit, your AI Doctor. How are you feeling today? Please describe any symptoms or health issues you'd like to discuss.", sender: 'bot' }
    ]);
    const [inputText, setInputText] = useState('');
    const [profile, setProfile] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const saved = await AsyncStorage.getItem('user_profile') || await AsyncStorage.getItem('user_profile_guest');
            if (saved) {
                setProfile(JSON.parse(saved));
            }
        } catch (e) {
            console.log("Error loading profile:", e);
        }
    };

    const renderFormattedText = (text) => {
        if (!text) return null;
        
        // Split text by **...**
        const parts = text.split(/(\*\*.*?\*\*)/g);
        
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                // Remove the ** and render as bold
                const boldContent = part.substring(2, part.length - 2);
                return (
                    <Text key={index} style={{ fontWeight: 'bold' }}>
                        {boldContent}
                    </Text>
                );
            }
            // Regular text
            return <Text key={index}>{part}</Text>;
        });
    };

    const handleSend = async () => {
        if (!inputText.trim() || loading) return;

        const userMsgText = inputText;
        const userMsg = { id: Date.now(), text: userMsgText, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/general-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: profile?.id,
                    message: userMsgText
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { id: Date.now(), text: data.ai_response, sender: 'bot' }]);
            } else {
                throw new Error(data.message || "Something went wrong");
            }
        } catch (error) {
            console.error("Chat Error:", error);
            const errMsg = error.message?.includes('AI Service Error')
                ? "The AI service is temporarily unavailable. Please try again shortly."
                : "I'm having trouble connecting. Please check your internet connection and try again.";
            setMessages(prev => [...prev, { id: Date.now(), text: errMsg, sender: 'bot' }]);
        } finally {
            setLoading(false);
        }
    };

    const renderProfileModal = () => {
        if (!profile) return null;
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={showProfile}
                onRequestClose={() => setShowProfile(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Your Profile</Text>
                            <TouchableOpacity onPress={() => setShowProfile(false)}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileDetails}>
                            <View style={styles.detailRow}>
                                <MaterialIcons name="person" size={20} color="#2196F3" />
                                <Text style={styles.detailLabel}>Name:</Text>
                                <Text style={styles.detailValue}>{profile.name || 'Not set'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <MaterialIcons name="email" size={20} color="#2196F3" />
                                <Text style={styles.detailLabel}>Email:</Text>
                                <Text style={styles.detailValue}>{profile.email || 'Not set'}</Text>
                            </View>

                            {profile.age && (
                                <View style={styles.healthSummary}>
                                    <Text style={styles.summaryTitle}>Health Summary</Text>
                                    <View style={styles.summaryGrid}>
                                        <Text style={styles.summaryItem}>Age: {profile.age}</Text>
                                        <Text style={styles.summaryItem}>BMI: {profile.bmi?.toFixed(1) || 'N/A'}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => setShowProfile(false)}
                        >
                            <Text style={styles.closeModalButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hosit Chat</Text>
                <View style={styles.headerRight}>
                    {profile && (
                        <TouchableOpacity onPress={() => setShowProfile(true)}>
                            <MaterialIcons name="account-circle" size={30} color="#2196F3" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {renderProfileModal()}

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg) => (
                    <View key={msg.id} style={[
                        styles.bubble,
                        msg.sender === 'user' ? styles.userBubble : styles.botBubble
                    ]}>
                        <Text style={[
                            styles.bubbleText,
                            msg.sender === 'user' ? styles.userText : styles.botText
                        ]}>
                            {renderFormattedText(msg.text)}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Describe symptoms or ask a health question..."
                        onSubmitEditing={handleSend}
                        editable={!loading}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, loading && { backgroundColor: '#ccc' }]}
                        onPress={handleSend}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.sendButtonText}>Send</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        elevation: 2,
    },
    backButton: {
        padding: 4,
    },
    backText: {
        color: '#2196F3',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    chatContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    chatContent: {
        paddingVertical: 20,
    },
    bubble: {
        maxWidth: '80%',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
    },
    botBubble: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    userBubble: {
        backgroundColor: '#2196F3',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    bubbleText: {
        fontSize: 16,
        lineHeight: 22,
    },
    botText: {
        color: '#333',
    },
    userText: {
        color: '#FFF',
    },
    footer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#2196F3',
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    sendButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    headerRight: {
        width: 50,
        alignItems: 'flex-end',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    profileDetails: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        width: 50,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    healthSummary: {
        marginTop: 10,
        padding: 15,
        backgroundColor: '#F0F7FF',
        borderRadius: 12,
    },
    summaryTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 10,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    summaryItem: {
        fontSize: 14,
        color: '#444',
    },
    closeModalButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeModalButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
