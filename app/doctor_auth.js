import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../constants/config';

export default function DoctorAuthScreen() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [hospital, setHospital] = useState('');
    const [phone, setPhone] = useState('');

    const handleAuth = async () => {
        if (!email || !password || (!isLogin && (!name || !specialization || !hospital || !phone))) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        const endpoint = isLogin ? '/doctor/login' : '/doctor/signup';
        const payload = isLogin
            ? { email, password }
            : { name, email, password, specialization, hospital_name: hospital, phone };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                if (isLogin) {
                    // Save Doctor Data & Token
                    await AsyncStorage.multiSet([
                        ['doctor_token', data.token],
                        ['doctor_profile', JSON.stringify(data.doctor)],
                        ['user_role', 'doctor']
                    ]);
                    Alert.alert('Success', 'Welcome back, Doctor!');
                    router.replace('/doctor_dashboard');
                } else {
                    Alert.alert('Success', 'Registration successful! Please login.');
                    setIsLogin(true);
                }
            } else {
                Alert.alert('Auth Failed', data.message || 'Error occurred');
            }
        } catch (error) {
            Alert.alert('Error', 'Server connection failed');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerContainer}>
                    <FontAwesome5 name="user-md" size={80} color="#4CAF50" />
                    <Text style={styles.appName}>Hosit DOCTOR</Text>
                    <Text style={styles.header}>{isLogin ? 'Doctor Login' : 'Doctor Registration'}</Text>
                </View>

                <View style={[styles.card, { borderTopWidth: 5, borderTopColor: '#4CAF50' }]}>
                    {!isLogin && (
                        <>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Dr. Aswin"
                                value={name}
                                onChangeText={setName}
                            />

                            <Text style={styles.label}>Specialization</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Cardiologist"
                                value={specialization}
                                onChangeText={setSpecialization}
                            />

                            <Text style={styles.label}>Hospital/Clinic Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="City General Hospital"
                                value={hospital}
                                onChangeText={setHospital}
                            />

                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="+91 9876543210"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </>
                    )}

                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="doctor@example.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Join Panel'}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
                        <Text style={styles.switchText}>
                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>Return to User Login</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F8E9',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginTop: 10,
    },
    header: {
        fontSize: 20,
        color: '#666',
        marginTop: 8,
    },
    card: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        color: '#444',
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#F1F3F5',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 16,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchButton: {
        alignItems: 'center',
        padding: 10,
    },
    switchText: {
        color: '#2E7D32',
        fontSize: 14,
        fontWeight: '600',
    },
    backBtn: {
        marginTop: 30,
        alignItems: 'center',
    },
    backText: {
        color: '#999',
        fontSize: 14,
        textDecorationLine: 'underline',
    }
});
