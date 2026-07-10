import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Animated, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUESTIONS = [
    { key: 'name', type: 'option', question: "Hi there! I'm your personal health assistant. What's your name?", options: ['Aswin', 'User', 'Guest'] },
    { key: 'email', type: 'option', question: "Nice to meet you, {name}! What is your email address?", options: ['aswin@example.com', 'user@example.com', 'guest@example.com'] },
    { key: 'age', type: 'option', question: "How old are you?", options: ['20', '25', '30', '35', '40', '45', '50', '60+'] },
    { key: 'gender', type: 'option', question: "What is your gender?", options: ['Male', 'Female', 'Other'] },
    { key: 'height', type: 'option', question: "What is your height in cm?", options: ['150', '160', '170', '175', '180', '190'] },
    { key: 'weight', type: 'option', question: "What is your weight in kg?", options: ['50', '60', '70', '80', '90', '100+'] },
    { key: 'bp', type: 'option', question: "How is your Blood Pressure usually?", options: ['Normal', 'High'] },
    { key: 'sugar', type: 'option', question: "How are your Blood Sugar levels?", options: ['Normal', 'High'] },
    { key: 'activity', type: 'option', question: "How active are you daily?", options: ['Low', 'Moderate', 'High'] },
    { key: 'smoking', type: 'option', question: "Do you smoke?", options: ['No', 'Yes'] },
    { key: 'alcohol', type: 'option', question: "Do you consume alcohol?", options: ['No', 'Yes'] },
    { key: 'sleep', type: 'option', question: "How many hours do you sleep daily?", options: ['5', '6', '7', '8', '9'] },
];

export default function ChatBot({ userId, userName, onLogout }) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [formData, setFormData] = useState({ name: userName, access_token: userId }); // Store basic info
    const scrollViewRef = useRef();

    const [showProfile, setShowProfile] = useState(false);
    const [inputMode, setInputMode] = useState('text'); // 'text', 'voice', 'image'
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadProgress();
    }, []);

    useEffect(() => {
        if (isLoaded) {
            saveProgress();
        }
    }, [messages, step, formData]);

    const loadProgress = async () => {
        const key = userId ? `chat_progress_${userId}` : 'chat_progress_guest';

        try {
            const saved = await AsyncStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                setStep(data.step);
                setMessages(data.messages);
                setFormData(data.formData);
            } else {
                // No ongoing chat, check for saved profile
                const savedProfile = await AsyncStorage.getItem('user_profile') || await AsyncStorage.getItem('user_profile_guest');
                if (savedProfile) {
                    const profile = JSON.parse(savedProfile);
                    setFormData({ ...profile });
                    setStep(100); // Conversational Mode
                    addBotMessage(`Welcome back ${profile.name}! How can I assist you with your health today?`, profile.name);
                } else {
                    // Initial greeting
                    if (userName) {
                        setStep(1); // Skip name Q
                        addBotMessage(QUESTIONS[1].question.replace('{name}', userName), userName);
                    } else {
                        addBotMessage(QUESTIONS[0].question);
                    }
                }
            }
        } catch (e) {
            console.log(e);
        } finally {
            setIsLoaded(true);
        }
    };

    const saveProgress = async () => {
        const key = userId ? `chat_progress_${userId}` : 'chat_progress_guest';
        try {
            await AsyncStorage.setItem(key, JSON.stringify({ step, messages, formData }));
        } catch (e) { console.log(e); }
    };

    const addBotMessage = (text, nameOverride) => {
        const nameToUse = nameOverride || formData.name || 'friend';
        const formattedText = text.replace('{name}', nameToUse);
        setMessages(prev => [...prev, { id: Date.now(), text: formattedText, sender: 'bot' }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user' }]);
    };

    const handleNext = (value) => {
        if (step === 100) {
            addUserMessage(value);
            // Simulate conversational response
            setTimeout(() => {
                if (inputMode === 'image') {
                    addBotMessage("I've received your image. Analyzing for potential health insights...");
                } else if (inputMode === 'voice') {
                    addBotMessage("Processing your voice message... I'll help you with that right away.");
                } else {
                    addBotMessage("I hear you. Let me look into that based on your stored health profile.");
                }
            }, 1000);
            return;
        }

        if (step === -1) {
            addUserMessage(value);
            const lowerValue = value.toLowerCase();

            if (lowerValue.includes('use') || lowerValue.includes('saved') || lowerValue.includes('yes') || lowerValue.includes('data')) {
                setTimeout(() => {
                    addBotMessage("Great! Loading your results...");
                    setTimeout(() => finish(formData), 1000);
                }, 600);
            } else if (lowerValue.includes('hosit') || lowerValue.includes('talk') || lowerValue.includes('chat')) {
                router.push('/general_chat');
            } else if (lowerValue.includes('fresh') || lowerValue.includes('new') || lowerValue.includes('start') || lowerValue.includes('no')) {
                // Start Fresh
                const resetData = { name: '', email: '', access_token: userId };
                setFormData(resetData);
                setStep(0);
                setTimeout(() => {
                    addBotMessage(QUESTIONS[0].question, 'friend');
                }, 600);
            } else {
                // If input is unclear, ask specifically
                setTimeout(() => {
                    addBotMessage("I'm not sure what you'd like to do. Would you like to 'Use saved data', 'Start fresh', or 'Talk to Hosit'?");
                }, 600);
            }
            return;
        }

        const currentQ = QUESTIONS[step];
        // Save data
        const newData = { ...formData, [currentQ.key]: value };
        setFormData(newData);

        // Add user response to chat
        addUserMessage(value);

        // Move to next step
        const nextStep = step + 1;
        if (nextStep < QUESTIONS.length) {
            setStep(nextStep);
            setTimeout(() => {
                addBotMessage(QUESTIONS[nextStep].question);
            }, 600);
        } else {
            // Finished!
            setTimeout(() => {
                addBotMessage("Thanks! Analyzing your profile now...");
                setTimeout(() => {
                    finish(newData);
                }, 1000);
            }, 600);
        }
    };

    const finish = async (finalData) => {
        const key = userId ? `chat_progress_${userId}` : 'chat_progress_guest';
        const isGuest = !userId && !(await AsyncStorage.getItem('user_token'));
        const profileKey = isGuest ? 'user_profile_guest' : 'user_profile';

        // Save full profile for future sessions
        try {
            await AsyncStorage.setItem(profileKey, JSON.stringify(finalData));
        } catch (e) { console.log("Error saving profile:", e); }

        await AsyncStorage.removeItem(key);
        router.push({
            pathname: '/result',
            params: { ...finalData, user_id: userId }
        });
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        handleNext(inputText);
        setInputText('');
    };

    const renderProfileModal = () => {
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
                                <Text style={styles.detailValue}>{formData.name || 'Not set'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <MaterialIcons name="email" size={20} color="#2196F3" />
                                <Text style={styles.detailLabel}>Email:</Text>
                                <Text style={styles.detailValue}>{formData.email || 'Not set'}</Text>
                            </View>

                            {/* Show summary of health data if it exists */}
                            {formData.age && (
                                <View style={styles.healthSummary}>
                                    <Text style={styles.summaryTitle}>Health Profile Summary</Text>
                                    <View style={styles.summaryGrid}>
                                        <Text style={styles.summaryItem}>Age: {formData.age}</Text>
                                        <Text style={styles.summaryItem}>Gender: {formData.gender}</Text>
                                        <Text style={styles.summaryItem}>BMI: {formData.bmi?.toFixed(1) || 'N/A'}</Text>
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

    const renderInput = () => {
        const currentQ = QUESTIONS[step];

        if (step === 100 || step === -1) {
            return (
                <View>
                    <View style={styles.modeToolbar}>
                        <TouchableOpacity
                            style={[styles.modeBtn, inputMode === 'image' && styles.activeModeBtn]}
                            onPress={() => router.push('/image_chat')}
                        >
                            <MaterialIcons name="camera-enhance" size={24} color={inputMode === 'image' ? '#FFF' : '#2196F3'} />
                            <Text style={[styles.modeBtnText, inputMode === 'image' && styles.activeModeBtnText]}>Image</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modeBtn, inputMode === 'voice' && styles.activeModeBtn]}
                            onPress={() => router.push('/voice_chat')}
                        >
                            <MaterialIcons name="mic" size={24} color={inputMode === 'voice' ? '#FFF' : '#2196F3'} />
                            <Text style={[styles.modeBtnText, inputMode === 'voice' && styles.activeModeBtnText]}>Voice</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modeBtn, inputMode === 'text' && styles.activeModeBtn]}
                            onPress={() => router.push('/general_chat')}
                        >
                            <MaterialIcons name="text-fields" size={24} color={inputMode === 'text' ? '#FFF' : '#2196F3'} />
                            <Text style={[styles.modeBtnText, inputMode === 'text' && styles.activeModeBtnText]}>Text</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        if (!currentQ) return null;

        if (currentQ.type === 'option') {
            return (
                <View style={styles.optionsContainer}>
                    {currentQ.options.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={styles.optionButton}
                            onPress={() => handleNext(option)}
                        >
                            <Text style={styles.optionText}>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        return null;
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={90}
        >
            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>Hosit Assistant</Text>
                {(formData.name || formData.email) && (
                    <TouchableOpacity onPress={() => setShowProfile(true)} style={styles.profileIconBtn}>
                        <MaterialIcons name="account-circle" size={30} color="#2196F3" />
                    </TouchableOpacity>
                )}
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
                        ]}>{msg.text}</Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                {renderInput()}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
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
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    botBubble: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    userBubble: {
        backgroundColor: '#2196F3', // Blue
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
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#1565C0',
    },
    logoutText: {
        color: '#FF5252',
        fontWeight: '600',
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
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    optionButton: {
        backgroundColor: '#E3F2FD',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#2196F3',
    },
    optionText: {
        color: '#1565C0',
        fontSize: 16,
        fontWeight: '600',
    },
    profileIconBtn: {
        padding: 4,
    },
    modeToolbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
        paddingHorizontal: 10,
    },
    modeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#E3F2FD',
        gap: 6,
    },
    activeModeBtn: {
        backgroundColor: '#2196F3',
    },
    modeBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    activeModeBtnText: {
        color: '#FFF',
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
