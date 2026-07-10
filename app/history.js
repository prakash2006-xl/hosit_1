import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';
import HistoryCard from '../components/HistoryCard';
import { MaterialIcons } from '@expo/vector-icons';

export default function HistoryScreen() {
    const router = useRouter();
    const [history, setHistory] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('assessments'); // 'assessments' or 'chats'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAllHistory();
    }, []);

    const loadAllHistory = async () => {
        setLoading(true);
        await Promise.all([loadHistory(), loadChatHistory()]);
        setLoading(false);
        setRefreshing(false);
    };

    const loadHistory = async () => {
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile') || await AsyncStorage.getItem('user_profile_guest');
            const profile = savedProfile ? JSON.parse(savedProfile) : {};
            const email = profile.email || '';
            const userId = profile.id || '';

            const response = await fetch(`${API_URL}/history?email=${email}&user_id=${userId}`);
            const data = await response.json();

            if (response.ok) {
                setHistory(data);
            }
        } catch (error) {
            console.error("History Error:", error);
        }
    };

    const loadChatHistory = async () => {
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile') || await AsyncStorage.getItem('user_profile_guest');
            const profile = savedProfile ? JSON.parse(savedProfile) : {};
            const userId = profile.id || '';

            if (!userId) return;

            const response = await fetch(`${API_URL}/chat-history?user_id=${userId}`);
            const data = await response.json();

            if (response.ok) {
                setChatHistory(data);
            }
        } catch (error) {
            console.error("Chat History Error:", error);
        }
    };

    const handlePress = (item) => {
        router.push({
            pathname: '/result',
            params: {
                ...item,
                recommendations: typeof item.recommendations === 'object'
                    ? JSON.stringify(item.recommendations)
                    : item.recommendations,
                fromHistory: true
            }
        });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text>Loading your history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#2196F3" />
                </TouchableOpacity>
                <Text style={styles.title}>History</Text>
                <View style={{ width: 40 }} />
            </View> */}

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'assessments' && styles.activeTab]}
                    onPress={() => setActiveTab('assessments')}
                >
                    <Text style={[styles.tabText, activeTab === 'assessments' && styles.activeTabText]}>Assessments</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
                    onPress={() => setActiveTab('chats')}
                >
                    <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>AI Chats</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'assessments' ? (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id.toString()}
                    ListHeaderComponent={history.length >= 2 ? (
                        <View style={styles.trendSection}>
                            <Text style={styles.sectionTitle}>Health Trends</Text>
                            <View style={styles.trendGrid}>
                                <TrendItem
                                    label="BMI"
                                    current={history[0].bmi}
                                    prev={history[1].bmi}
                                    unit=""
                                    inverse
                                />
                                <TrendItem
                                    label="Weight"
                                    current={history[0].weight}
                                    prev={history[1].weight}
                                    unit="kg"
                                    inverse
                                />
                                <TrendItem
                                    label="Sleep"
                                    current={history[0].sleep_hours}
                                    prev={history[1].sleep_hours}
                                    unit="h"
                                />
                            </View>
                        </View>
                    ) : null}
                    renderItem={({ item }) => (
                        <HistoryCard item={item} onPress={() => handlePress(item)} />
                    )}
                    contentContainerStyle={styles.list}
                    onRefresh={loadAllHistory}
                    refreshing={refreshing}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name="assessment" size={60} color="#DDD" />
                            <Text style={styles.emptyText}>No assessments yet.</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={chatHistory}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.chatCard}>
                            <View style={styles.chatHeader}>
                                <MaterialIcons name="chat" size={16} color="#666" />
                                <Text style={styles.chatDate}>{item.created_at}</Text>
                            </View>
                            <Text style={styles.msgLabel}>You:</Text>
                            <Text style={styles.userMsg} numberOfLines={2}>{item.user_message}</Text>
                            <Text style={styles.msgLabel}>Hosit:</Text>
                            <Text style={styles.botMsg} numberOfLines={3}>{item.ai_response}</Text>
                        </View>
                    )}
                    contentContainerStyle={styles.list}
                    onRefresh={loadAllHistory}
                    refreshing={refreshing}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name="forum" size={60} color="#DDD" />
                            <Text style={styles.emptyText}>No chat history yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

function TrendItem({ label, current, prev, unit, inverse = false }) {
    const diff = (parseFloat(current) - parseFloat(prev)).toFixed(1);
    const isIncrease = diff > 0;
    const isPositive = inverse ? !isIncrease : isIncrease;

    if (isNaN(diff)) return null;

    return (
        <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>{label}</Text>
            <View style={styles.trendValueRow}>
                <Text style={styles.trendValue}>{current}{unit}</Text>
                <View style={[styles.badge, { backgroundColor: diff == 0 ? '#EEE' : (isPositive ? '#E8F5E9' : '#FFEBEE') }]}>
                    <MaterialIcons
                        name={diff == 0 ? 'remove' : (isIncrease ? 'arrow-upward' : 'arrow-downward')}
                        size={14}
                        color={diff == 0 ? '#999' : (isPositive ? '#4CAF50' : '#F44336')}
                    />
                    <Text style={[styles.badgeText, { color: diff == 0 ? '#999' : (isPositive ? '#4CAF50' : '#F44336') }]}>
                        {Math.abs(diff)}
                    </Text>
                </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFF',
        elevation: 2,
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    list: {
        padding: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
        marginTop: 10,
    },
    trendSection: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    trendGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    trendItem: {
        flex: 1,
    },
    trendLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    trendValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trendValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    tab: {
        paddingVertical: 12,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#2196F3',
    },
    tabText: {
        fontSize: 15,
        color: '#666',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#2196F3',
    },
    chatCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    chatDate: {
        fontSize: 12,
        color: '#999',
    },
    msgLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#888',
        marginTop: 4,
    },
    userMsg: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
        backgroundColor: '#F9F9F9',
        padding: 8,
        borderRadius: 8,
    },
    botMsg: {
        fontSize: 14,
        color: '#2196F3',
        lineHeight: 20,
        backgroundColor: '#F0F7FF',
        padding: 8,
        borderRadius: 8,
    },
});
