import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { API_URL } from '../constants/config';

export default function OnboardingScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        age: '',
        gender: 'Male',
        height: '',
        weight: '',
        bp_status: 'Normal',
        sugar_status: 'Normal',
        activity_level: 'Moderate',
        smoking: 'No',
        alcohol: 'No',
        sleep_hours: ''
    });

    React.useEffect(() => {
        const loadExistingData = async () => {
            try {
                const savedProfile = await AsyncStorage.getItem('user_profile');
                if (savedProfile && savedProfile !== 'undefined') {
                    const profile = JSON.parse(savedProfile);
                    if (profile) {
                        setFormData(prev => ({
                            ...prev,
                            age: profile.age ? profile.age.toString() : '',
                            gender: profile.gender || 'Male',
                            height: profile.height ? profile.height.toString() : '',
                            weight: profile.weight ? profile.weight.toString() : '',
                            bp_status: profile.bp_status || 'Normal',
                            sugar_status: profile.sugar_status || 'Normal',
                            activity_level: profile.activity_level || 'Moderate',
                            smoking: profile.smoking || 'No',
                            alcohol: profile.alcohol || 'No',
                            sleep_hours: profile.sleep_hours ? profile.sleep_hours.toString() : ''
                        }));
                    }
                }
            } catch (err) {
                console.error("Error loading profile into onboarding:", err);
            }
        };
        loadExistingData();
    }, []);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleComplete = async () => {
        // Basic validation
        if (!formData.age || !formData.height || !formData.weight || !formData.sleep_hours) {
            Alert.alert("Missing Info", "Please fill in all numerical fields.");
            return;
        }

        setLoading(true);
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile');
            const profile = savedProfile ? JSON.parse(savedProfile) : {};
            const userId = profile.id;

            if (!userId) {
                Alert.alert("Error", "User session not found. Please log in again.");
                router.replace('/auth');
                return;
            }

            // Calculate BMI
            const h_m = parseFloat(formData.height) / 100;
            const w_kg = parseFloat(formData.weight);
            const bmi = w_kg / (h_m * h_m);

            const payload = {
                user_id: userId,
                ...formData,
                bmi: bmi.toFixed(1)
            };

            const response = await fetch(`${API_URL}/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                // Update local storage
                const updatedProfile = { ...profile, ...payload };
                await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));

                Alert.alert("Success", "Your profile is set up!");
                router.replace('/dashboard');
            } else {
                Alert.alert("Failed", data.message || "Could not save profile.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Basic Info</Text>
                        <Text style={styles.label}>How old are you?</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="Age"
                            value={formData.age}
                            onChangeText={(v) => updateField('age', v)}
                        />

                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.row}>
                            {['Male', 'Female', 'Other'].map(g => (
                                <TouchableOpacity
                                    key={g}
                                    style={[styles.chip, formData.gender === g && styles.activeChip]}
                                    onPress={() => updateField('gender', g)}
                                >
                                    <Text style={[styles.chipText, formData.gender === g && styles.activeChipText]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Body Metrics</Text>
                        <Text style={styles.label}>Height (cm)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="e.g. 175"
                            value={formData.height}
                            onChangeText={(v) => updateField('height', v)}
                        />

                        <Text style={styles.label}>Weight (kg)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="e.g. 70"
                            value={formData.weight}
                            onChangeText={(v) => updateField('weight', v)}
                        />
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Health Status</Text>

                        <Text style={styles.label}>Blood Pressure</Text>
                        <View style={styles.row}>
                            {['Normal', 'High'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, formData.bp_status === s && styles.activeChip]}
                                    onPress={() => updateField('bp_status', s)}
                                >
                                    <Text style={[styles.chipText, formData.bp_status === s && styles.activeChipText]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Blood Sugar</Text>
                        <View style={styles.row}>
                            {['Normal', 'High'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, formData.sugar_status === s && styles.activeChip]}
                                    onPress={() => updateField('sugar_status', s)}
                                >
                                    <Text style={[styles.chipText, formData.sugar_status === s && styles.activeChipText]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Lifestyle</Text>

                        <Text style={styles.label}>Activity Level</Text>
                        <View style={styles.row}>
                            {['Low', 'Moderate', 'High'].map(l => (
                                <TouchableOpacity
                                    key={l}
                                    style={[styles.chip, formData.activity_level === l && styles.activeChip]}
                                    onPress={() => updateField('activity_level', l)}
                                >
                                    <Text style={[styles.chipText, formData.activity_level === l && styles.activeChipText]}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Do you smoke?</Text>
                        <View style={styles.row}>
                            {['No', 'Yes'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, formData.smoking === s && styles.activeChip]}
                                    onPress={() => updateField('smoking', s)}
                                >
                                    <Text style={[styles.chipText, formData.smoking === s && styles.activeChipText]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Sleep (hrs/day)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="e.g. 7.5"
                            value={formData.sleep_hours}
                            onChangeText={(v) => updateField('sleep_hours', v)}
                        />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Let's Set Up Your Profile</Text>
                    <Text style={styles.subtitle}>Step {step} of 4</Text>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${(step / 4) * 100}%` }]} />
                    </View>
                </View>

                {renderStep()}

                <View style={styles.footer}>
                    {step > 1 && (
                        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                            <Text style={styles.backBtnText}>Back</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.nextBtn, step === 1 && { width: '100%' }]}
                        onPress={() => step < 4 ? setStep(step + 1) : handleComplete()}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.nextBtnText}>{step === 4 ? 'Finish' : 'Next'}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1565C0',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
    progressContainer: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginTop: 15,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#2196F3',
        borderRadius: 3,
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#555',
        marginTop: 20,
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#DDD',
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    activeChip: {
        backgroundColor: '#E3F2FD',
        borderColor: '#2196F3',
    },
    chipText: {
        color: '#666',
        fontWeight: '600',
    },
    activeChipText: {
        color: '#1565C0',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 40,
        gap: 15,
    },
    nextBtn: {
        flex: 1,
        backgroundColor: '#2196F3',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backBtn: {
        width: 100,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    backBtnText: {
        color: '#666',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
