import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EntryPoint() {
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('user_token');
            const guestData = await AsyncStorage.getItem('user_profile_guest');

            if (token || guestData) {
                router.replace('/dashboard');
            } else {
                router.replace('/auth');
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            router.replace('/auth');
        }
    };

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#2196F3" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    }
});
