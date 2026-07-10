import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

export default function BookAppointmentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { doctorId, doctorName, doctorSpecialization, hospitalName } = params;

    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [loading, setLoading] = useState(false);

    const handleBook = async () => {
        if (!date || !time || !symptoms) {
            Alert.alert('Missing Fields', 'Please fill out all fields to request an appointment.');
            return;
        }

        setLoading(true);
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile');
            if (!savedProfile) {
                Alert.alert("Error", "You must be logged in to book an appointment.");
                setLoading(false);
                return;
            }
            const profile = JSON.parse(savedProfile);

            const payload = {
                patient_id: profile.id,
                doctor_id: doctorId,
                date: date,
                time: time,
                symptoms: symptoms
            };

            const response = await fetch(`${API_URL}/patient/book_appointment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                Alert.alert(
                    "Booking Sent", 
                    `Your request has been sent to Dr. ${doctorName}. You will receive a notification once they confirm your time slot and token number.`,
                    [{ text: "OK", onPress: () => router.back() }]
                );
            } else {
                Alert.alert("Failed", data.message || "Failed to book appointment.");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Network Error", "Could not connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Book Appointment</Text>
                <View style={{width: 24}} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.docCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{doctorName ? doctorName.charAt(0) : 'D'}</Text>
                    </View>
                    <View style={styles.docInfo}>
                        <Text style={styles.docName}>Dr. {doctorName}</Text>
                        <Text style={styles.docSpec}>{doctorSpecialization}</Text>
                        <View style={styles.hospitalRow}>
                            <MaterialIcons name="local-hospital" size={14} color="#666" />
                            <Text style={styles.hospitalText}>{hospitalName || 'Hosit Partner Clinic'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Appointment Details</Text>
                    
                    <Text style={styles.label}>Preferred Date</Text>
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="calendar-today" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 2026-07-20"
                            value={date}
                            onChangeText={setDate}
                        />
                    </View>

                    <Text style={styles.label}>Preferred Time</Text>
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="access-time" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 10:30 AM"
                            value={time}
                            onChangeText={setTime}
                        />
                    </View>

                    <Text style={styles.label}>Symptoms / Reason for Visit</Text>
                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Describe your symptoms briefly..."
                            multiline
                            numberOfLines={4}
                            value={symptoms}
                            onChangeText={setSymptoms}
                        />
                    </View>

                    <View style={styles.infoBox}>
                        <MaterialIcons name="info-outline" size={20} color="#1976D2" />
                        <Text style={styles.infoText}>
                            The doctor may adjust your requested time based on their availability. You will receive a Token Number upon confirmation.
                        </Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.submitBtn} 
                        onPress={handleBook}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitBtnText}>Submit Booking Request</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backBtn: { padding: 5 },
    content: { padding: 20 },
    
    docCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2, alignItems: 'center' },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontSize: 28, fontWeight: 'bold', color: '#1976D2' },
    docInfo: { flex: 1 },
    docName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 2 },
    docSpec: { fontSize: 15, color: '#2196F3', fontWeight: '500', marginBottom: 4 },
    hospitalRow: { flexDirection: 'row', alignItems: 'center' },
    hospitalText: { fontSize: 13, color: '#777', marginLeft: 4 },
    
    formSection: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 12, marginBottom: 20, backgroundColor: '#FAFAFA' },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 50, fontSize: 16, color: '#333' },
    
    textAreaContainer: { alignItems: 'flex-start', paddingVertical: 10 },
    textArea: { flex: 1, minHeight: 100, fontSize: 16, color: '#333', textAlignVertical: 'top' },
    
    infoBox: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginBottom: 25 },
    infoText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#1565C0', lineHeight: 18 },
    
    submitBtn: { backgroundColor: '#1976D2', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
