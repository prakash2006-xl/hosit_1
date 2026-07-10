import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const profileStr = await AsyncStorage.getItem('user_profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                const response = await fetch(`${API_URL}/patient/notifications/${profile.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setNotifications(data);
                    
                    // Mark as read
                    await fetch(`${API_URL}/patient/notifications/read`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: profile.id })
                    });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderNotification = ({ item }) => (
        <View style={[styles.card, !item.is_read && styles.unreadCard]}>
            <View style={styles.iconContainer}>
                <MaterialIcons name="notifications-active" size={24} color="#1976D2" />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{width: 24}} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderNotification}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialIcons name="notifications-none" size={60} color="#CCC" />
                            <Text style={styles.emptyText}>You have no notifications yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backBtn: { padding: 5 },
    list: { padding: 15 },
    card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    unreadCard: { backgroundColor: '#F0F8FF', borderColor: '#BBDEFB', borderWidth: 1 },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    content: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    message: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 6 },
    time: { fontSize: 12, color: '#999' },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2196F3', alignSelf: 'center', marginLeft: 10 },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, fontSize: 16, color: '#888' }
});
