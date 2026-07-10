
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

export default function VoiceBot() {
    const router = useRouter();
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Press mic to speak'); // 'Press mic to speak', 'Listening...', 'Processing...', 'Speaking...'
    const [messages, setMessages] = useState([]); // Array of { text, sender }
    const [profile, setProfile] = useState(null);
    const scrollViewRef = useRef();

    useEffect(() => {
        loadProfile();
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
            Speech.stop();
        };
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

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);
                setStatus('Listening...');
            } else {
                Alert.alert("Permission Denied", "Microphone permission is required.");
            }
        } catch (err) {
            console.error('Failed to start recording', err);
            setStatus('Error starting recording');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setStatus('Processing...');
        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            // Process Audio
            await processAudio(uri);
        } catch (error) {
            console.error('Failed to stop recording', error);
            setStatus('Error processing');
        }
    };

    const processAudio = async (uri) => {
        try {
            // 1. Send to STT Endpoint
            const formData = new FormData();
            formData.append('audio', {
                uri: uri,
                type: 'audio/wav', // Ensure content-type is correct for typical recordings
                name: 'upload.wav',
            });

            const sttResp = await fetch(`${API_URL}/stt`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!sttResp.ok) {
                throw new Error("STT Failed");
            }

            const sttData = await sttResp.json();
            const userText = sttData.text;

            if (!userText) {
                setStatus('Could not understand audio');
                return;
            }

            // Show User Message
            setMessages(prev => [...prev, { text: userText, sender: 'user' }]);

            // 2. Send to General Chat
            const chatResp = await fetch(`${API_URL}/general-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: profile?.id,
                    message: userText
                })
            });

            const chatData = await chatResp.json();
            const botResponse = chatData.ai_response;

            // Show Bot Message
            setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
            setStatus('Speaking...');

            // 3. TTS
            const speechText = botResponse.replace(/[*#]/g, '');
            Speech.speak(speechText, {
                onDone: () => setStatus('Press mic to speak'),
                onStopped: () => setStatus('Press mic to speak'),
                pitch: 1.0,
                rate: 1.0
            });

        } catch (error) {
            console.error("Processing Error:", error);
            setStatus('Error occurred');
            Alert.alert("Error", "Could not process your request.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#2196F3" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hosit Voice</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="graphic-eq" size={80} color="#ddd" />
                        <Text style={styles.emptyText}>Tap microphone to start speaking</Text>
                    </View>
                )}
                {messages.map((msg, index) => (
                    <View key={index} style={[
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

            <View style={styles.controls}>
                <Text style={styles.statusText}>{status}</Text>

                <TouchableOpacity
                    style={[styles.micButton, isRecording && styles.recordingButton]}
                    onPress={isRecording ? stopRecording : startRecording}
                >
                    <MaterialIcons
                        name={isRecording ? "stop" : "mic"}
                        size={40}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>
        </View>
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
        paddingTop: 50, // Safe area adjustment
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    chatContainer: {
        flex: 1,
    },
    chatContent: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
        opacity: 0.7,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
        marginTop: 16,
    },
    bubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
    },
    userBubble: {
        backgroundColor: '#2196F3',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        elevation: 2,
    },
    bubbleText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: { color: '#FFF' },
    botText: { color: '#333' },
    controls: {
        backgroundColor: '#FFF',
        padding: 24,
        alignItems: 'center',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    statusText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        fontWeight: '600',
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    recordingButton: {
        backgroundColor: '#FF5252',
        transform: [{ scale: 1.1 }],
    }
});
