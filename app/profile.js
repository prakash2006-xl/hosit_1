import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await AsyncStorage.getItem('user_profile');
            if (data) {
                setProfile(JSON.parse(data));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    onPress: async () => {
                        await AsyncStorage.clear();
                        router.replace('/auth');
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.center}>
                <Text>Not logged in</Text>
                <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace('/auth')}>
                    <Text style={styles.loginBtnText}>Login Now</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarCircle}>
                    <MaterialIcons name="person" size={50} color="#2196F3" />
                </View>
                <Text style={styles.userName}>{profile.name}</Text>
                <Text style={styles.userEmail}>{profile.email}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Health Profile</Text>

                <View style={styles.healthStatsGrid}>
                    <HealthStat label="Age" value={profile.age || '--'} icon="calendar-alt" color="#FF9800" />
                    <HealthStat label="Gender" value={profile.gender || '--'} icon="venus-mars" color="#E91E63" />
                    <HealthStat label="Height" value={profile.height ? `${profile.height} cm` : '--'} icon="ruler-vertical" color="#4CAF50" />
                    <HealthStat label="Weight" value={profile.weight ? `${profile.weight} kg` : '--'} icon="weight" color="#2196F3" />
                    <HealthStat label="BMI" value={profile.bmi || '--'} icon="calculator" color="#9C27B0" />
                    <HealthStat label="Sleep" value={profile.sleep_hours ? `${profile.sleep_hours}h` : '--'} icon="moon" color="#3F51B5" />
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/onboarding')}>
                    <MaterialIcons name="edit" size={20} color="#2196F3" />
                    <Text style={styles.editBtnText}>Edit Health Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.editBtn, { marginTop: 0, borderColor: '#E8F5E9' }]} onPress={() => router.push('/medical_history')}>
                    <MaterialIcons name="history" size={20} color="#4CAF50" />
                    <Text style={[styles.editBtnText, { color: '#4CAF50' }]}>Update Medical History</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Settings</Text>

                <ProfileItem icon="notifications-none" label="Notifications" />
                <ProfileItem icon="security" label="Privacy & Security" />
                <ProfileItem icon="help-outline" label="Help & Support" />
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <MaterialIcons name="logout" size={24} color="#F44336" />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

function HealthStat({ icon, label, value, color }) {
    return (
        <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
                <FontAwesome5 name={icon} size={16} color={color} />
            </View>
            <View>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue}>{value}</Text>
            </View>
        </View>
    );
}

function ProfileItem({ icon, label }) {
    return (
        <TouchableOpacity style={styles.item}>
            <View style={styles.itemContent}>
                <MaterialIcons name={icon} size={24} color="#555" />
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        backgroundColor: '#FFF',
        alignItems: 'center',
        padding: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    userEmail: {
        fontSize: 16,
        color: '#777',
        marginTop: 4,
    },
    section: {
        marginTop: 20,
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#999',
        marginVertical: 15,
        textTransform: 'uppercase',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    itemLabel: {
        fontSize: 16,
        color: '#333',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        margin: 30,
        padding: 15,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    logoutText: {
        color: '#F44336',
        fontSize: 16,
        fontWeight: 'bold',
    },
    healthStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        paddingVertical: 10,
    },
    statItem: {
        width: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 15,
    },
    statIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#777',
    },
    statValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E3F2FD',
        borderRadius: 10,
        marginTop: 10,
        marginBottom: 20,
    },
    editBtnText: {
        color: '#2196F3',
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginBtn: {
        marginTop: 20,
        backgroundColor: '#2196F3',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
    },
    loginBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
    }
});
