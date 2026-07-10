import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Vibration, Linking } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Haptics from 'expo-haptics';
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
    const [alertedIds, setAlertedIds] = useState(new Set());

    // SOS State Variables
    const [isTriggered, setIsTriggered] = useState(false);
    const [triggerType, setTriggerType] = useState('Manual');
    const [countdown, setCountdown] = useState(10);
    const [contacts, setContacts] = useState([]);

    // SOS Settings
    const [shakeEnabled, setShakeEnabled] = useState(false);
    const [call108Enabled, setCall108Enabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(true);
    const [sirenEnabled, setSirenEnabled] = useState(true);
    const [flashlightEnabled, setFlashlightEnabled] = useState(true);
    const [vibrateEnabled, setVibrateEnabled] = useState(true);
    const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);

    const countdownIntervalRef = useRef(null);

    const loadDashboard = useCallback(async () => {
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile') || await AsyncStorage.getItem('user_profile_guest');
            const parsedProfile = savedProfile ? JSON.parse(savedProfile) : {};
            setProfile(parsedProfile);

            // Load configurations from AsyncStorage
            const savedShake = await AsyncStorage.getItem('guardian_shake_enabled');
            setShakeEnabled(savedShake === 'true');

            const savedCall108 = await AsyncStorage.getItem('guardian_call_108_enabled');
            setCall108Enabled(savedCall108 !== 'false');

            const savedSms = await AsyncStorage.getItem('guardian_sms_enabled');
            setSmsEnabled(savedSms !== 'false');

            const savedSiren = await AsyncStorage.getItem('guardian_siren_enabled');
            setSirenEnabled(savedSiren !== 'false');

            const savedFlash = await AsyncStorage.getItem('guardian_flash_enabled');
            setFlashlightEnabled(savedFlash !== 'false');

            const savedVibrate = await AsyncStorage.getItem('guardian_vibrate_enabled');
            setVibrateEnabled(savedVibrate !== 'false');

            const savedLocShare = await AsyncStorage.getItem('guardian_location_sharing_enabled');
            setLocationSharingEnabled(savedLocShare !== 'false');

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
                }
            } else {
                console.error("Dashboard error:", result.error);
            }

            // Fetch emergency contacts
            if (userId && userId !== 0) {
                const contactsRes = await fetch(`${API_URL}/emergency/contacts?user_id=${userId}`);
                if (contactsRes.ok) {
                    const contactsData = await contactsRes.json();
                    setContacts(contactsData);
                }
            } else {
                try {
                    const localContacts = await AsyncStorage.getItem('local_emergency_contacts');
                    setContacts(localContacts ? JSON.parse(localContacts) : []);
                } catch (e) {
                    console.error("Failed to load local emergency contacts", e);
                }
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

    // Accelerometer Shake listener setup
    useEffect(() => {
        let subscription = null;
        if (shakeEnabled && !isTriggered) {
            Accelerometer.setUpdateInterval(150);
            let lastX = 0, lastY = 0, lastZ = 0;
            let lastTime = Date.now();
            subscription = Accelerometer.addListener(data => {
                const { x, y, z } = data;
                const currentTime = Date.now();
                const timeDiff = currentTime - lastTime;
                if (timeDiff > 100) {
                    const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / timeDiff * 10000;
                    if (speed > 800) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        triggerCountdown('Automatic');
                    }
                    lastX = x;
                    lastY = y;
                    lastZ = z;
                    lastTime = currentTime;
                }
            });
        }
        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, [shakeEnabled, isTriggered]);

    // Countdown and Workflow handlers
    const triggerCountdown = (type = 'Manual') => {
        setTriggerType(type);
        setIsTriggered(true);
        setCountdown(10);
        
        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownIntervalRef.current);
                    executeEmergencyAction();
                    return 0;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                playBeepSound();
                return prev - 1;
            });
        }, 1000);
    };

    const playBeepSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://www.soundjay.com/buttons/beep-07.mp3' },
                { shouldPlay: true }
            );
            setTimeout(() => sound.unloadAsync(), 1000);
        } catch (e) {}
    };

    const cancelEmergency = async () => {
        clearInterval(countdownIntervalRef.current);
        setIsTriggered(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const now = new Date();
        const eventId = `EMG-${now.getTime()}`;
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();

        if (profile.id && profile.id !== 0) {
            try {
                await fetch(`${API_URL}/emergency/event/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event_id: eventId,
                        user_id: profile.id,
                        event_date: dateStr,
                        event_time: timeStr,
                        trigger_type: triggerType,
                        location: '0.0, 0.0',
                        contacts_notified: 0,
                        call_108_status: 'Skipped',
                        status: 'Cancelled',
                        latitude: 0,
                        longitude: 0,
                        battery_percentage: 100
                    })
                });
            } catch (e) {}
        } else {
            try {
                const cancelledEventObj = {
                    event_id: eventId,
                    user_id: 0,
                    event_date: dateStr,
                    event_time: timeStr,
                    trigger_type: triggerType,
                    location: '0.0, 0.0',
                    contacts_notified: 0,
                    call_108_status: 'Skipped',
                    status: 'Cancelled',
                    latitude: 0,
                    longitude: 0,
                    battery_percentage: 100
                };
                const savedEvents = await AsyncStorage.getItem('local_emergency_events');
                const parsedEvents = savedEvents ? JSON.parse(savedEvents) : [];
                parsedEvents.push(cancelledEventObj);
                await AsyncStorage.setItem('local_emergency_events', JSON.stringify(parsedEvents));
            } catch (e) {}
        }
        Alert.alert("SOS Cancelled", "Emergency alarm aborted successfully.");
    };

    const executeEmergencyAction = async () => {
        setIsTriggered(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        const now = new Date();
        const eventId = `EMG-${now.getTime()}`;
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();

        let batteryLvl = 100;
        try {
            batteryLvl = Math.round((await Battery.getBatteryLevelAsync()) * 100);
        } catch (e) {}

        let locationCoords = null;
        let mapsLink = "Location Unavailable";
        let locationStr = "0.0, 0.0";

        if (locationSharingEnabled) {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                    locationCoords = loc.coords;
                    locationStr = `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`;
                    mapsLink = `https://www.google.com/maps/search/?api=1&query=${loc.coords.latitude},${loc.coords.longitude}`;
                }
            } catch (e) {}
        }

        // Call 108
        let callStatus108 = 'Skipped';
        if (call108Enabled) {
            callStatus108 = 'Called';
            Linking.openURL('tel:108').catch(() => {});
        }

        // Send SMS to emergency contacts
        let notifiedCount = 0;
        if (smsEnabled && contacts.length > 0) {
            notifiedCount = contacts.length;
            const smsContent = `🚨 EMERGENCY ALERT 🚨\n\n${profile.name || 'Patient'} may be in danger and requires immediate assistance.\n\nTime: ${timeStr}\n\nLive Location: ${mapsLink}\n\nPlease contact the patient immediately or reach the location as soon as possible.`;

            contacts.forEach(c => {
                Linking.openURL(`sms:${c.phone}?body=${encodeURIComponent(smsContent)}`).catch(() => {});
            });
        }

        // Create Active Event
        if (profile.id && profile.id !== 0) {
            try {
                await fetch(`${API_URL}/emergency/event/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event_id: eventId,
                        user_id: profile.id,
                        event_date: dateStr,
                        event_time: timeStr,
                        trigger_type: triggerType,
                        location: locationStr,
                        contacts_notified: notifiedCount,
                        call_108_status: callStatus108,
                        status: 'Active',
                        latitude: locationCoords ? locationCoords.latitude : 0,
                        longitude: locationCoords ? locationCoords.longitude : 0,
                        battery_percentage: batteryLvl
                    })
                });
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                const activeEventObj = {
                    event_id: eventId,
                    user_id: 0,
                    event_date: dateStr,
                    event_time: timeStr,
                    trigger_type: triggerType,
                    location: locationStr,
                    contacts_notified: notifiedCount,
                    call_108_status: callStatus108,
                    status: 'Active',
                    latitude: locationCoords ? locationCoords.latitude : 0,
                    longitude: locationCoords ? locationCoords.longitude : 0,
                    battery_percentage: batteryLvl,
                    audit_trail: JSON.stringify([{ timestamp: timeStr, event: `Emergency event initialized via ${triggerType} trigger (Offline/Guest mode).` }])
                };
                await AsyncStorage.setItem('local_active_emergency', JSON.stringify(activeEventObj));
            } catch (err) {
                console.error("Failed to save local emergency event", err);
            }
        }

        // Redirect to Guardian Active Console
        router.push('/guardian');
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
        <View style={{ flex: 1 }}>
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
            {activities.length > 0 && (
                <View style={styles.card}>
                    <View style={[styles.cardHeader, { backgroundColor: '#4CAF50', borderRadius: 12, padding: 10 }]}>
                        <MaterialIcons name="event-note" size={20} color="#FFF" />
                        <Text style={styles.cardTitleWhite}>Doctor's Daily Orders</Text>
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

            <View style={styles.actionSection}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }]} onPress={() => router.push('/guardian')}>
                    <View style={styles.actionBtnInner}>
                        <MaterialIcons name="security" size={28} color="#D32F2F" />
                        <Text style={[styles.actionBtnText, { color: '#C62828', fontWeight: 'bold' }]}>Guardian AI (Emergency)</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#D32F2F" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/nearby_doctors')}>
                    <View style={styles.actionBtnInner}>
                        <FontAwesome5 name="user-md" size={26} color="#4CAF50" />
                        <Text style={styles.actionBtnText}>Apply to Doctor</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#4CAF50" />
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

        {/* Floating SOS button */}
        <TouchableOpacity 
            style={styles.floatingSosBtn}
            onPress={() => {
                Alert.alert(
                    "Confirm Emergency SOS",
                    "Are you sure you want to trigger emergency alerts?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Trigger SOS", style: "destructive", onPress: () => triggerCountdown('Manual') }
                    ]
                );
            }}
        >
            <FontAwesome5 name="radiation" size={24} color="white" />
            <Text style={styles.floatingSosText}>SOS</Text>
        </TouchableOpacity>



        {/* Countdown Overlay Modal */}
        <Modal visible={isTriggered} transparent={true} animationType="fade">
            <View style={styles.countdownOverlay}>
                <Text style={styles.countdownTitle}>
                    {triggerType === 'Automatic' ? 'POSSIBLE EMERGENCY DETECTED' : 'EMERGENCY SOS INITIATED'}
                </Text>
                <Text style={styles.countdownSubtitle}>
                    Emergency will be triggered in {countdown} seconds.
                </Text>
                <View style={styles.countdownCircle}>
                    <Text style={styles.countdownNumber}>{countdown}</Text>
                </View>
                <TouchableOpacity style={styles.cancelBtn} onPress={cancelEmergency}>
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    </View>
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
    floatingSosBtn: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: '#D32F2F',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    floatingSosText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        marginTop: 2,
    },
    floatingAiBtn: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        backgroundColor: '#2196F3',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    countdownOverlay: {
        flex: 1,
        backgroundColor: '#B71C1C',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    countdownTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    countdownSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 20,
    },
    countdownCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    countdownNumber: {
        color: 'white',
        fontSize: 54,
        fontWeight: 'bold',
    },
    cancelBtn: {
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 24,
        elevation: 2,
    },
    cancelBtnText: {
        color: '#D32F2F',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
