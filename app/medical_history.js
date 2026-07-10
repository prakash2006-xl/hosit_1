import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { API_URL } from '../constants/config';

export default function MedicalHistoryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        allergies: '',
        existing_diseases: '',
        current_medications: '',
        past_surgeries: '',
        family_history: '',
        blood_group: ''
    });

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile');
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                const userId = profile.id;
                
                const res = await fetch(`${API_URL}/patient/${userId}/medical-history`);
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        allergies: data.allergies || '',
                        existing_diseases: data.existing_diseases || '',
                        current_medications: data.current_medications || '',
                        past_surgeries: data.past_surgeries || '',
                        family_history: data.family_history || '',
                        blood_group: data.blood_group || ''
                    });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile');
            const profile = savedProfile ? JSON.parse(savedProfile) : {};
            const userId = profile.id;

            if (!userId) {
                Alert.alert("Error", "User session not found.");
                return;
            }

            const payload = {
                user_id: userId,
                ...formData
            };

            const response = await fetch(`${API_URL}/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Alert.alert("Success", "Medical history updated successfully!");
                router.back();
            } else {
                Alert.alert("Failed", "Could not save history.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medical History</Text>
                <View style={{width: 24}} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.infoText}>
                    Please provide your medical history. This information will be visible to doctors during your consultation to provide safer and better prescriptions.
                </Text>

                <Text style={styles.label}>Blood Group</Text>
                <View style={styles.row}>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                        <TouchableOpacity
                            key={bg}
                            style={[styles.chip, formData.blood_group === bg && styles.activeChip]}
                            onPress={() => setFormData({ ...formData, blood_group: bg })}
                        >
                            <Text style={[styles.chipText, formData.blood_group === bg && styles.activeChipText]}>{bg}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Allergies</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="E.g., Penicillin, Peanuts, Pollen (Leave blank if none)"
                    multiline={true}
                    numberOfLines={3}
                    value={formData.allergies}
                    onChangeText={(t) => setFormData({...formData, allergies: t})}
                />

                <Text style={styles.label}>Existing Conditions / Chronic Diseases</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="E.g., Asthma, Hypertension, Diabetes"
                    multiline={true}
                    numberOfLines={3}
                    value={formData.existing_diseases}
                    onChangeText={(t) => setFormData({...formData, existing_diseases: t})}
                />

                <Text style={styles.label}>Current Medications</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="List any medicines you take daily"
                    multiline={true}
                    numberOfLines={3}
                    value={formData.current_medications}
                    onChangeText={(t) => setFormData({...formData, current_medications: t})}
                />

                <Text style={styles.label}>Past Surgeries & Major Illnesses</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Describe any past surgeries or hospitalizations"
                    multiline={true}
                    numberOfLines={3}
                    value={formData.past_surgeries}
                    onChangeText={(t) => setFormData({...formData, past_surgeries: t})}
                />

                <Text style={styles.label}>Family Medical History</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="E.g., Father had heart attack at 50"
                    multiline={true}
                    numberOfLines={3}
                    value={formData.family_history}
                    onChangeText={(t) => setFormData({...formData, family_history: t})}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Medical History</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backBtn: { padding: 5 },
    scrollContent: { padding: 20, paddingBottom: 50 },
    infoText: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginTop: 15, marginBottom: 10 },
    textArea: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#DDD', minHeight: 100, textAlignVertical: 'top' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD' },
    activeChip: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
    chipText: { color: '#666', fontWeight: '600' },
    activeChipText: { color: '#1565C0' },
    saveBtn: { backgroundColor: '#2196F3', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
