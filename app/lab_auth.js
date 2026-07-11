import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../constants/config';

export default function LabAuthScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('lab@hosit.ai');
    const [password, setPassword] = useState('demo123');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !password) {
            Alert.alert('Error', 'Please enter laboratory email and password.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/lab/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail, password })
            });
            const data = await response.json();
            if (!response.ok) {
                Alert.alert('Login Failed', data.message || 'Invalid laboratory credentials.');
                return;
            }
            await AsyncStorage.multiSet([
                ['lab_token', data.token],
                ['lab_profile', JSON.stringify(data.lab)],
                ['user_role', 'laboratory']
            ]);
            Alert.alert('Success', 'Welcome to the Laboratory Portal.');
            router.replace('/lab_dashboard');
        } catch (e) {
            Alert.alert('Error', 'Could not open laboratory portal.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <MaterialIcons name="science" size={76} color="#7E57C2" />
                    <Text style={styles.appName}>Hosit LAB</Text>
                    <Text style={styles.subtitle}>Laboratory Login</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Login</Text>}
                    </TouchableOpacity>
                    <Text style={styles.helper}>Local demo login. Does not access patient records, AI chat, prescriptions, or medical history.</Text>
                </View>

                <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/auth')}>
                    <Text style={styles.backText}>Return to User Login</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3E5F5' },
    content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 34 },
    appName: { fontSize: 32, fontWeight: '800', color: '#5E35B1', marginTop: 10 },
    subtitle: { fontSize: 18, color: '#666', marginTop: 6 },
    card: { backgroundColor: '#FFF', padding: 24, borderRadius: 20, borderTopWidth: 5, borderTopColor: '#7E57C2' },
    label: { fontSize: 14, color: '#444', fontWeight: '800', marginBottom: 8 },
    input: { backgroundColor: '#F1F3F5', borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 16 },
    button: { backgroundColor: '#7E57C2', padding: 17, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    buttonText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    helper: { color: '#777', fontSize: 12, lineHeight: 18, marginTop: 14 },
    backBtn: { alignItems: 'center', marginTop: 28 },
    backText: { color: '#777', textDecorationLine: 'underline' },
});
