import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';

export default function AuthScreen() {
    const { t } = useLanguage();
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');

    const handleAuth = async () => {
        if (!email || !password || (!isLogin && (!name || !phone))) {
            Alert.alert(t('auth.error_title'), t('auth.fill_fields'));
            return;
        }

        setLoading(true);
        const endpoint = isLogin ? '/login' : '/signup';
        const payload = isLogin ? { email, password } : { name, email, password, phone };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                // Save User Data
                await AsyncStorage.multiSet([
                    ['user_token', 'logged_in'],
                    ['user_profile', JSON.stringify(data.user)]
                ]);

                // Determine redirection
                const isProfileIncomplete = isLogin && (!data.user.age || !data.user.height || !data.user.weight);

                Alert.alert(t('auth.success_title'), isLogin ? t('auth.welcome_msg') : t('auth.account_created'));
                router.replace(isLogin ? '/dashboard' : '/onboarding');
            } else {
                if (!isLogin && data.message && data.message.includes('already signed up')) {
                    Alert.alert(
                        t('auth.reg_failed'),
                        data.message,
                        [
                            { text: t('common.cancel'), style: "cancel" },
                            { text: t('auth.go_to_login'), onPress: () => setIsLogin(true) }
                        ]
                    );
                } else {
                    Alert.alert(t('auth.auth_failed'), data.message || t('common.error_title'));
                }
            }
        } catch (error) {
            Alert.alert(t('auth.error_title'), t('auth.server_error'));
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
                    <MaterialIcons name="health-and-safety" size={80} color="#2196F3" />
                    <Text style={styles.appName}>Hosit AI</Text>
                    <Text style={styles.header}>{isLogin ? t('auth.welcome_back') : t('auth.create_account')}</Text>
                </View>

                <View style={styles.card}>
                    {!isLogin && (
                        <>
                            <Text style={styles.label}>{t('auth.full_name')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.name_placeholder')}
                                value={name}
                                onChangeText={setName}
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

                    <Text style={styles.label}>{t('auth.email_label')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('auth.email_placeholder')}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={styles.label}>{t('auth.password_label')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('auth.password_placeholder')}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>{isLogin ? t('auth.login_button') : t('auth.signup_button')}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
                        <Text style={styles.switchText}>
                            {isLogin ? t('auth.dont_have_account') : t('auth.already_have_account')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.doctorBtn} onPress={() => router.push('/doctor_auth')}>
                    <Text style={styles.doctorText}>Are you a Doctor? <Text style={styles.doctorLink}>Login Here</Text></Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.guestBtn} onPress={async () => {
                    const guestProfile = {
                        id: 0,
                        name: "Guest User",
                        email: "guest@hosit.ai",
                        age: "",
                        gender: "",
                        height: "",
                        weight: "",
                        bmi: "",
                        bp_status: "",
                        sugar_status: "",
                        activity_level: "",
                        smoking: "",
                        alcohol: "",
                        sleep_hours: ""
                    };
                    try {
                        await AsyncStorage.setItem('user_profile_guest', JSON.stringify(guestProfile));
                        router.replace('/dashboard');
                    } catch (err) {
                        console.error("Failed to save guest profile", err);
                        router.replace('/dashboard');
                    }
                }}>
                    <Text style={styles.guestText}>{t('auth.continue_guest')}</Text>
                </TouchableOpacity>

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
        color: '#1565C0',
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
        backgroundColor: '#2196F3',
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
        color: '#1565C0',
        fontSize: 14,
        fontWeight: '600',
    },
    guestBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    guestText: {
        color: '#999',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    doctorBtn: {
        marginTop: 30,
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#2196F3',
        borderRadius: 12,
        backgroundColor: '#E3F2FD',
    },
    doctorText: {
        color: '#444',
        fontSize: 14,
    },
    doctorLink: {
        color: '#2196F3',
        fontWeight: 'bold',
    }
});

