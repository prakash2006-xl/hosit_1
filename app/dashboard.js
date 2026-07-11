import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';

export default function DashboardScreen() {
    const { t } = useLanguage();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState({});
    const [activities, setActivities] = useState([]);
    const [labTests, setLabTests] = useState([]);
    const [alertedIds, setAlertedIds] = useState(new Set());
    const [notifications, setNotifications] = useState([]);

    const loadDashboard = useCallback(async () => {
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile') || await AsyncStorage.getItem('user_profile_guest');
            const parsedProfile = savedProfile ? JSON.parse(savedProfile) : {};
            setProfile(parsedProfile);

            const email = parsedProfile.email || '';
            const userId = parsedProfile.id || '';
            const response = await fetch(`${API_URL}/dashboard-summary?email=${email}&user_id=${userId}`);
            const result = await response.json();

            if (response.ok) {
                setData(result);
                if (result.user_profile) {
                    setProfile(result.user_profile);
                    await AsyncStorage.setItem('user_profile', JSON.stringify(result.user_profile));
                    fetchActivities(result.user_profile.id);
                    fetchLabTests(result.user_profile.id);
                    fetchNotifications(result.user_profile.id);
                }
            } else {
                console.error("Dashboard error:", result.error);
            }
        } catch (error) {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchActivities = async (userId) => {
        try {
            const response = await fetch(`${API_URL}/user/activities?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setActivities(data);
            }
        } catch (error) {
            console.error("Fetch activities error:", error);
        }
    };

    const fetchLabTests = async (userId) => {
        try {
            const response = await fetch(`${API_URL}/patient/prescriptions/${userId}`);
            if (response.ok) {
                const data = await response.json();
                // Extract all tests from all prescriptions
                let allTests = [];
                data.forEach(presc => {
                    if (presc.tests && presc.tests.length > 0) {
                        presc.tests.forEach(test => {
                            allTests.push({ test_name: test, doctor_name: presc.doctor_name, date: new Date(presc.created_at).toLocaleDateString() });
                        });
                    }
                });
                setLabTests(allTests);
            }
        } catch (e) {
            console.error('Error fetching lab tests:', e);
        }
    };

    const fetchNotifications = async (userId) => {
        try {
            const response = await fetch(`${API_URL}/user/notifications?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            const localRaw = await AsyncStorage.getItem('patient_notifications');
            setNotifications(localRaw ? JSON.parse(localRaw) : []);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            activities.forEach(activity => {
                if (activity.scheduled_time === currentTime && !alertedIds.has(activity.id)) {
                    Alert.alert(
                        "⏰ Activity Reminder",
                        `It's time for: ${activity.activity_name}\nPrescribed by: Dr. ${activity.doctor_name}`,
                        [{ text: "OK", onPress: () => setAlertedIds(prev => new Set(prev).add(activity.id)) }]
                    );
                }
            });
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [activities, alertedIds]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    const latest = data?.latest;
    const counts = data?.counts;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.greeting} numberOfLines={1}>{t('dashboard.greeting', { name: profile.name || t('common.friend') })}</Text>
                        <Text style={styles.subtitle} numberOfLines={1}>{t('dashboard.subtitle')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileBtn}>
                        <MaterialIcons name="person" size={28} color="#2196F3" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* BMI Card */}
            <View style={[styles.card, styles.bmiCard]}>
                <View style={styles.cardHeader}>
                    <MaterialIcons name="speed" size={24} color="#FFF" />
                    <Text style={[styles.cardTitleWhite, { flex: 1 }]} numberOfLines={2}>{t('dashboard.bmi_status')}</Text>
                </View>
                <View style={styles.bmiContent}>
                    <Text style={styles.bmiValue}>
                        {(() => {
                            // Calculate BMI from current profile data
                            const bmi = profile.height && profile.weight
                                ? (profile.weight / ((profile.height / 100) * (profile.height / 100)))
                                : profile.bmi;
                            return bmi ? bmi.toFixed(1) : '--';
                        })()}
                    </Text>
                    <View>
                        <Text style={styles.bmiLabel}>
                            {(() => {
                                const bmi = profile.height && profile.weight
                                    ? (profile.weight / ((profile.height / 100) * (profile.height / 100)))
                                    : profile.bmi;
                                if (!bmi) return t('dashboard.na');
                                if (bmi > 30) return t('dashboard.obese');
                                if (bmi > 25) return t('dashboard.overweight');
                                if (bmi >= 18.5) return t('dashboard.normal');
                                return t('dashboard.underweight');
                            })()}
                        </Text>
                        <Text style={styles.bmiSub}>
                            {profile.height && profile.weight ? `${profile.weight}kg / ${profile.height}cm` : t('dashboard.complete_profile')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* User Profile Overview */}
            <View style={styles.card}>
                <View style={styles.cardHeaderBlue}>
                    <MaterialIcons name="person" size={20} color="#FFF" />
                    <Text style={[styles.cardTitleWhite, { flex: 1 }]} numberOfLines={2}>{t('dashboard.profile_details')}</Text>
                </View>
                <View style={styles.detailGrid}>
                    <DetailItem label={t('dashboard.age')} value={profile.age || '--'} />
                    <DetailItem label={t('dashboard.gender')} value={profile.gender || '--'} />
                    <DetailItem label={t('dashboard.height')} value={profile.height ? `${profile.height} cm` : '--'} />
                    <DetailItem label={t('dashboard.weight')} value={profile.weight ? `${profile.weight} kg` : '--'} />
                    <DetailItem label={t('dashboard.bp_status')} value={profile.bp_status || '--'} />
                    <DetailItem label={t('dashboard.activity')} value={profile.activity_level || '--'} />
                </View>

                {/* New Recommendations Button */}
                <TouchableOpacity
                    style={styles.recommendationBtn}
                    onPress={() => router.push({
                        pathname: '/result',
                        params: { ...profile, fromDashboard: 'true' }
                    })}
                >
                    <MaterialIcons name="lightbulb" size={20} color="#2196F3" />
                    <Text style={styles.recommendationBtnText}>{t('dashboard.view_recommendations')}</Text>
                    <MaterialIcons name="chevron-right" size={20} color="#2196F3" />
                </TouchableOpacity>
            </View>

            {/* Daily Health Tasks */}
            {notifications.length > 0 && (
                <View style={styles.card}>
                    <View style={[styles.cardHeader, { backgroundColor: '#7E57C2', borderRadius: 12, padding: 10 }]}>
                        <MaterialIcons name="notifications" size={20} color="#FFF" />
                        <Text style={styles.cardTitleWhite}>Latest Notifications</Text>
                    </View>
                    {notifications.slice(0, 3).map((item) => (
                        <View key={item.id} style={styles.notificationItem}>
                            <Text style={styles.notificationTitle}>{item.title}</Text>
                            <Text style={styles.notificationText}>{item.message}</Text>
                        </View>
                    ))}
                </View>
            )}

            {activities.length > 0 && (
                <View style={styles.card}>
                    <View style={[styles.cardHeader, { backgroundColor: '#4CAF50', borderRadius: 12, padding: 10 }]}>
                        <MaterialIcons name="event-note" size={20} color="#FFF" />
                        <Text style={styles.cardTitleWhite}>Doctor&apos;s Daily Orders</Text>
                    </View>
                    <View style={styles.activityList}>
                        {activities.map((item) => (
                            <View key={item.id} style={styles.activityItem}>
                                <View style={styles.timeBadge}>
                                    <Text style={styles.timeText}>{item.scheduled_time}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.activityName}>{item.activity_name}</Text>
                                    <Text style={styles.doctorName}>By Dr. {item.doctor_name}</Text>
                                </View>
                                {alertedIds.has(item.id) ? (
                                    <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                                ) : (
                                    <MaterialIcons name="radio-button-unchecked" size={24} color="#DDD" />
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Recommended Lab Tests */}
            {labTests.length > 0 && (
                <View style={styles.card}>
                    <View style={[styles.cardHeader, { backgroundColor: '#9C27B0', borderRadius: 12, padding: 10 }]}>
                        <MaterialIcons name="science" size={20} color="#FFF" />
                        <Text style={styles.cardTitleWhite}>Recommended Lab Tests</Text>
                    </View>
                    <View style={styles.activityList}>
                        {labTests.map((item, index) => (
                            <View key={index} style={styles.activityItem}>
                                <View style={[styles.timeBadge, { backgroundColor: '#F3E5F5' }]}>
                                    <Text style={[styles.timeText, { color: '#7B1FA2' }]}>{item.date}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.activityName}>{item.test_name}</Text>
                                    <Text style={styles.doctorName}>Prescribed by Dr. {item.doctor_name}</Text>
                                </View>
                                <TouchableOpacity style={{ padding: 5 }} onPress={() => Alert.alert('Book Test', 'Lab test booking will be available soon.')}>
                                    <MaterialIcons name="local-hospital" size={24} color="#9C27B0" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <View style={styles.actionSection}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }]} onPress={() => router.push('/guardian')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="security" size={28} color="#D32F2F" />
                        <Text style={[styles.actionBtnText, { color: '#C62828', fontWeight: 'bold' }]}>Guardian AI Emergency</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#D32F2F" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/nearby_doctors')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="map" size={28} color="#4CAF50" />
                        <Text style={styles.actionBtnText}>Find Nearby Doctors</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#4CAF50" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/find_doctors')}>
                    <View style={styles.actionBtnInner}>
                        <FontAwesome5 name="search-plus" size={26} color="#FF9800" />
                        <Text style={styles.actionBtnText}>Find & Book Doctors</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#FF9800" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/nearby_labs')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="science" size={28} color="#7E57C2" />
                        <Text style={styles.actionBtnText}>Find Nearby Laboratories</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#7E57C2" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/lab_reports')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="analytics" size={28} color="#7E57C2" />
                        <Text style={styles.actionBtnText}>Lab Reports & AI Analysis</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#7E57C2" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/diet_monitoring')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="restaurant" size={28} color="#009688" />
                        <Text style={styles.actionBtnText}>Diet Monitoring</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#009688" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/diet_plan')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="assignment" size={28} color="#009688" />
                        <Text style={styles.actionBtnText}>Current Diet Plan</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#009688" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/general_chat')}>
                    <View style={styles.actionBtnInner}>
                        <FontAwesome5 name="robot" size={26} color="#03A9F4" />
                        <Text style={styles.actionBtnText}>AI Chat Assistant</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#03A9F4" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/patient_prescriptions')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="receipt" size={28} color="#9C27B0" />
                        <Text style={styles.actionBtnText}>My Prescriptions</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#9C27B0" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/history')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="history" size={28} color="#2196F3" />
                        <Text style={styles.actionBtnText}>{t('dashboard.full_history')}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#2196F3" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={() => router.push('/assessment')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="add-circle" size={28} color="#FFF" />
                        <Text style={[styles.actionBtnText, styles.whiteText]}>{t('dashboard.new_check')}</Text>
                    </View>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
}

function DetailItem({ label, value }) {
    return (
        <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

function StatBox({ label, count, icon, color }) {
    return (
        <View style={styles.statBox}>
            <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
                <FontAwesome5 name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statCount}>{count}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profileBtn: {
        backgroundColor: '#E3F2FD',
        padding: 8,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#2196F3',
        elevation: 2,
        flexShrink: 0,
    },
    greeting: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1565C0',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    bmiCard: {
        backgroundColor: '#2196F3',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 8,
    },
    cardTitleWhite: {
        fontSize: 16, // Reduced from 18 for better fit
        fontWeight: 'bold',
        color: '#FFF',
    },
    bmiContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    bmiValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF',
    },
    bmiLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    bmiSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    cardHeaderBlue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#1E88E5',
        padding: 12,
        borderRadius: 56,
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 15,
        gap: 15,
    },
    detailItem: {
        width: '45%',
    },
    detailLabel: {
        fontSize: 12,
        color: '#777',
        textTransform: 'uppercase',
    },
    detailValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 30,
    },
    statBox: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        elevation: 2,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statCount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#777',
        marginTop: 2,
    },
    actionSection: {
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 52,
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    primaryBtn: {
        backgroundColor: '#2196F3',
        borderColor: '#2196F3',
        justifyContent: 'center',
        marginTop: 8,
    },
    actionBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    whiteText: {
        color: '#FFF',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recommendationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        marginHorizontal: 15,
        marginBottom: 15,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BBDEFB',
        gap: 10,
    },
    recommendationBtnText: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1565C0',
    },
    activityList: {
        marginTop: 10,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    timeBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        minWidth: 50,
        alignItems: 'center',
    },
    timeText: {
        color: '#2E7D32',
        fontWeight: 'bold',
        fontSize: 13,
    },
    activityName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    doctorName: {
        fontSize: 12,
        color: '#777',
        marginTop: 2,
    },
    notificationItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    notificationText: {
        fontSize: 12,
        color: '#666',
        marginTop: 3,
    },
});
