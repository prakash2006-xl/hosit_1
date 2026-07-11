import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../constants/config';

export default function DoctorDashboard() {
    const router = useRouter();
    const [doctor, setDoctor] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    
    // Search Patient States
    const [searchEmail, setSearchEmail] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchedUser, setSearchedUser] = useState(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [updatingHealth, setUpdatingHealth] = useState(false);
    
    // Activity States
    const [patientActivities, setPatientActivities] = useState([]);
    const [newActivity, setNewActivity] = useState('');
    const [activityTime, setActivityTime] = useState('');
    const [prescribing, setPrescribing] = useState(false);

    // Form states for updating health
    const [editForm, setEditForm] = useState({
        height: '', weight: '', bp_status: 'Normal', sugar_status: 'Normal',
        activity_level: 'Moderate', smoking: 'No', alcohol: 'No', sleep_hours: '8'
    });

    useEffect(() => {
        loadDoctorProfile();
    }, []);

    useEffect(() => {
        let interval;
        if (isOnline) {
            // Start location tracking when online
            startTracking();
            interval = setInterval(updateStatusOnServer, 30000); // Sync every 30s
        } else {
            stopTracking();
            if (interval) clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOnline]);

    const loadDoctorProfile = async () => {
        try {
            const profile = await AsyncStorage.getItem('doctor_profile');
            if (profile) {
                const parsed = JSON.parse(profile);
                setDoctor(parsed);
                setIsOnline(parsed.is_available === 1);
            } else {
                router.replace('/doctor_auth');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const startTracking = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Location permission is required to go online.');
            setIsOnline(false);
            return;
        }

        try {
            let loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setLocation(loc.coords);
            updateStatusOnServer(loc.coords, true);
        } catch (e) {
            console.warn('Current location unavailable, trying last known position:', e);
            try {
                let lastLoc = await Location.getLastKnownPositionAsync({});
                if (lastLoc) {
                    setLocation(lastLoc.coords);
                    updateStatusOnServer(lastLoc.coords, true);
                } else {
                    throw new Error('No location available');
                }
            } catch (err) {
                Alert.alert('Location Error', 'Your location could not be determined. Please ensure GPS is enabled.');
                setIsOnline(false);
            }
        }
    };

    const stopTracking = () => {
        updateStatusOnServer(null, false);
    };

    const updateStatusOnServer = async (coords = location, status = isOnline) => {
        if (!doctor) return;

        try {
            const payload = {
                doctor_id: doctor.id,
                is_available: status,
                latitude: coords ? coords.latitude : null,
                longitude: coords ? coords.longitude : null
            };

            const response = await fetch(`${API_URL}/doctor/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error('Failed to sync status');
            }
        } catch (e) {
            console.error('Network error sync status', e);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['doctor_token', 'doctor_profile', 'user_role']);
        router.replace('/auth');
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            if (!doctor?.id) return;
            const response = await fetch(`${API_URL}/doctor/profile/${doctor.id}`);
            if (response.ok) {
                const refreshedDoctor = await response.json();
                await AsyncStorage.setItem('doctor_profile', JSON.stringify(refreshedDoctor));
                setDoctor(refreshedDoctor);
                setIsOnline(refreshedDoctor.is_available === 1);
            }
        } catch (e) {
            console.error('Refresh error:', e);
        } finally {
            setRefreshing(false);
        }
    };

    const [activePatients, setActivePatients] = useState([]);
    const [fetchingPatients, setFetchingPatients] = useState(false);

    useEffect(() => {
        if (doctor?.patient_queue) {
            try {
                const queue = JSON.parse(doctor.patient_queue);
                if (Array.isArray(queue) && queue.length > 0) {
                    fetchActivePatients(queue);
                } else {
                    setActivePatients([]);
                }
            } catch (e) {
                console.error('Invalid patient queue:', e);
                setActivePatients([]);
            }
        }
    }, [doctor?.patient_queue]);

    const fetchActivePatients = async (queue) => {
        setFetchingPatients(true);
        try {
            const response = await fetch(`${API_URL}/doctor/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_ids: queue })
            });

            if (response.ok) {
                const data = await response.json();
                setActivePatients(data);
            }
        } catch (e) {
            console.error('Error fetching patients:', e);
        } finally {
            setFetchingPatients(false);
        }
    };

    const getRiskBadgeColor = (risk) => {
        if (risk === 'High') return '#FF5252';
        if (risk === 'Medium') return '#FF9800';
        return '#4CAF50';
    };

    const handleCall = (phone) => {
        if (!phone) {
            Alert.alert('Error', 'No phone number available for this patient.');
            return;
        }
        Linking.openURL(`tel:${phone}`);
    };

    const handleSearch = async () => {
        if (!searchEmail) return;
        setSearchLoading(true);
        try {
            const response = await fetch(`${API_URL}/doctor/search-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: searchEmail })
            });
            const result = await response.json();
            if (response.ok) {
                setSearchedUser(result.user);
                fetchPatientActivities(searchEmail);
                setEditForm({
                    height: result.user.height?.toString() || '',
                    weight: result.user.weight?.toString() || '',
                    bp_status: result.user.bp_status || 'Normal',
                    sugar_status: result.user.sugar_status || 'Normal',
                    activity_level: result.user.activity_level || 'Moderate',
                    smoking: result.user.smoking || 'No',
                    alcohol: result.user.alcohol || 'No',
                    sleep_hours: result.user.sleep_hours?.toString() || '8'
                });
            } else {
                Alert.alert('Not Found', result.message);
                setSearchedUser(null);
            }
        } catch (e) {
            Alert.alert('Error', 'Search failed. Check your connection.');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleUpdateHealth = async () => {
        if (!searchedUser) return;
        if (!editForm.height || !editForm.weight) {
            Alert.alert('Missing Info', 'Please enter height and weight before saving.');
            return;
        }

        setUpdatingHealth(true);
        try {
            const response = await fetch(`${API_URL}/doctor/update-user-health`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: searchedUser.email,
                    doctor_id: doctor?.id,
                    name: searchedUser.name,
                    age: searchedUser.age,
                    gender: searchedUser.gender,
                    height: editForm.height,
                    weight: editForm.weight,
                    bp_status: editForm.bp_status,
                    sugar_status: editForm.sugar_status,
                    activity_level: editForm.activity_level,
                    smoking: editForm.smoking,
                    alcohol: editForm.alcohol,
                    sleep_hours: editForm.sleep_hours
                })
            });
            const result = await response.json();

            if (response.ok) {
                Alert.alert('Saved', result.message || 'Health record updated.');
                setSearchedUser({
                    ...searchedUser,
                    height: editForm.height,
                    weight: editForm.weight,
                    bp_status: editForm.bp_status,
                    sugar_status: editForm.sugar_status,
                    activity_level: editForm.activity_level,
                    smoking: editForm.smoking,
                    alcohol: editForm.alcohol,
                    sleep_hours: editForm.sleep_hours
                });
                setEditModalVisible(false);
                onRefresh();
            } else {
                Alert.alert('Update Failed', result.message || 'Could not update health record.');
            }
        } catch (e) {
            Alert.alert('Error', 'Could not connect to the server.');
        } finally {
            setUpdatingHealth(false);
        }
    };

    const fetchPatientActivities = async (email) => {
        try {
            const response = await fetch(`${API_URL}/doctor/activities/${email}`);
            if (response.ok) {
                const data = await response.json();
                setPatientActivities(data);
            }
        } catch (e) {
            console.error('Fetch activities error:', e);
        }
    };

    const handlePrescribeActivity = async () => {
        if (!newActivity || !activityTime) {
            Alert.alert('Missing Info', 'Please enter activity name and time (HH:MM)');
            return;
        }
        
        // Simple validation for HH:MM
        const timeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
        if (!timeRegex.test(activityTime)) {
            Alert.alert('Invalid Time', 'Please use 24h format (e.g. 08:30 or 14:00)');
            return;
        }
        const normalizedTime = activityTime.includes(':')
            ? activityTime
            : `${activityTime.slice(0, 2)}:${activityTime.slice(2)}`;

        setPrescribing(true);
        try {
            const response = await fetch(`${API_URL}/doctor/prescribe-activity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: searchedUser.id,
                    doctor_id: doctor.id,
                    activity_name: newActivity,
                    scheduled_time: normalizedTime
                })
            });

            if (response.ok) {
                setNewActivity('');
                setActivityTime('');
                fetchPatientActivities(searchedUser.email);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to prescribe activity');
        } finally {
            setPrescribing(false);
        }
    };

    const handleRemoveActivity = async (id) => {
        try {
            const response = await fetch(`${API_URL}/doctor/remove-activity/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchPatientActivities(searchedUser.email);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to remove activity');
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
            }
        >
            {/* Top Bar / Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcome}>Good day,</Text>
                    <Text style={styles.name}>Dr. {doctor?.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={onRefresh} style={[styles.logoutBtn, { marginRight: 10, borderColor: '#E3F2FD', backgroundColor: '#F0F7FF' }]}>
                        <MaterialIcons name="refresh" size={24} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <MaterialIcons name="power-settings-new" size={24} color="#FF5252" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Quick Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#2196F3' }]}>
                        {activePatients.length}
                    </Text>
                    <Text style={styles.statLabel}>Alerts</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                        {isOnline ? 'LIVE' : 'OFF'}
                    </Text>
                    <Text style={styles.statLabel}>Status</Text>
                </View>
                <View style={[styles.statCard, { borderRightWidth: 0 }]}>
                    <Text style={[styles.statValue, { color: '#FF9800' }]}>
                        {doctor?.specialization?.charAt(0) || 'G'}
                    </Text>
                    <Text style={styles.statLabel}>Rating</Text>
                </View>
            </View>

            {/* Availability Toggle */}
            <View style={styles.statusCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>Practice Status</Text>
                    <Text style={styles.statusSub}>
                        {isOnline ? 'You are currently visible to patients' : 'Switch online to receive patient alerts'}
                    </Text>
                </View>
                <Switch
                    value={isOnline}
                    onValueChange={setIsOnline}
                    trackColor={{ false: "#E0E0E0", true: "#81C784" }}
                    thumbColor={isOnline ? "#4CAF50" : "#F5F5F5"}
                />
            </View>

            {/* Search Patient Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Checkup / Search Patient</Text>
                <TouchableOpacity
                    style={styles.dietShortcut}
                    onPress={() => router.push('/doctor_diet_prescription')}
                >
                    <MaterialIcons name="restaurant-menu" size={22} color="#009688" />
                    <Text style={styles.dietShortcutText}>Create Diet Prescription</Text>
                    <MaterialIcons name="chevron-right" size={22} color="#009688" />
                </TouchableOpacity>
                <View style={styles.searchCard}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Enter Patient Email ID"
                        value={searchEmail}
                        onChangeText={setSearchEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TouchableOpacity 
                        style={styles.searchBtn} 
                        onPress={handleSearch}
                        disabled={searchLoading}
                    >
                        {searchLoading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <MaterialIcons name="search" size={24} color="white" />
                        )}
                    </TouchableOpacity>
                </View>

                {searchedUser && (
                    <View style={styles.searchResult}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.resName}>{searchedUser.name}</Text>
                            <Text style={styles.resEmail}>{searchedUser.email}</Text>
                        </View>
                        <TouchableOpacity style={styles.updateBtn} onPress={() => setEditModalVisible(true)}>
                            <Text style={styles.updateBtnText}>Update Health</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Location Display if Online */}
            {isOnline && location && (
                <View style={styles.locCard}>
                    <View style={styles.locIconContainer}>
                        <MaterialIcons name="gps-fixed" size={20} color="white" />
                    </View>
                    <View style={{ marginLeft: 15 }}>
                        <Text style={styles.locLabel}>Broadcast Location</Text>
                        <Text style={styles.locValue}>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
                    </View>
                </View>
            )}

            {/* Profile Info Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Details</Text>
                <View style={styles.infoBox}>
                    <View style={styles.infoItem}>
                        <FontAwesome5 name="stethoscope" size={16} color="#666" style={{ width: 25 }} />
                        <Text style={styles.infoText}>{doctor?.specialization || 'General Physician'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <MaterialIcons name="business" size={18} color="#666" style={{ width: 25 }} />
                        <Text style={styles.infoText}>{doctor?.hospital_name || 'Hosit Partner Clinic'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <MaterialIcons name="phone" size={18} color="#666" style={{ width: 25 }} />
                        <Text style={styles.infoText}>{doctor?.phone || 'Not Provided'}</Text>
                    </View>
                    <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
                        <MaterialIcons name="email" size={18} color="#666" style={{ width: 25 }} />
                        <Text style={styles.infoText}>{doctor?.email}</Text>
                    </View>
                </View>
            </View>

            {/* Patient Alerts List */}
            <View style={styles.queueSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Patient Alerts</Text>
                    <View style={styles.alertBadge}>
                        <Text style={styles.alertBadgeText}>Emergency</Text>
                    </View>
                </View>

                <View style={styles.queueContainer}>
                    {fetchingPatients ? (
                        <ActivityIndicator style={{ margin: 20 }} color="#FF5252" />
                    ) : activePatients.length > 0 ? (
                        activePatients.map((patient, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.queueItem}
                                onPress={() => {
                                    setSelectedPatient(patient);
                                    setModalVisible(true);
                                }}
                            >
                                <View style={styles.alertCircle}>
                                    <MaterialIcons name="priority-high" size={16} color="white" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={[styles.queueText, { fontSize: 17 }]}>{patient.name}</Text>
                                        <Text style={[styles.queueSub, { marginLeft: 5 }]}>{patient.last_assessment_date ? new Date(patient.last_assessment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <View style={[styles.statusIndicator, { backgroundColor: patient.bp_status === 'High' ? '#FF5252' : '#4CAF50' }]} />
                                        <Text style={[styles.queueSub, { fontWeight: '600', color: patient.bp_status === 'High' ? '#FF5252' : '#666' }]}>
                                            BP: {patient.bp_status || 'N/A'}
                                        </Text>
                                        <Text style={[styles.queueSub, { marginLeft: 10 }]}>Age: {patient.age || 'N/A'}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                                        {patient.heart_risk === 'High' && <View style={[styles.riskSmallBadge, { backgroundColor: '#FF5252' }]}><Text style={styles.riskText}>Heart</Text></View>}
                                        {patient.diabetes_risk === 'High' && <View style={[styles.riskSmallBadge, { backgroundColor: '#FF9800' }]}><Text style={styles.riskText}>Diabetes</Text></View>}
                                        {patient.hypertension_risk === 'High' && <View style={[styles.riskSmallBadge, { backgroundColor: '#E91E63' }]}><Text style={styles.riskText}>Hypertension</Text></View>}
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => handleCall(patient.phone)} style={styles.callButton}>
                                    <MaterialIcons name="call" size={24} color="#4CAF50" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="notifications-none" size={48} color="#EEE" />
                            <Text style={styles.emptyQueue}>No active emergency calls right now.</Text>
                        </View>
                    )}
                </View>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Patient Assessment</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Patient ID & Name */}
                            <View style={styles.patientHero}>
                                <View style={styles.avatarLarge}>
                                    <Text style={styles.avatarText}>{selectedPatient?.name?.charAt(0)}</Text>
                                </View>
                                <Text style={styles.heroName}>{selectedPatient?.name}</Text>
                                <Text style={styles.heroSub}>{selectedPatient?.gender || 'N/A'} • Age: {selectedPatient?.age || 'N/A'}</Text>
                                <Text style={styles.heroSub}>{selectedPatient?.email}</Text>
                            </View>

                            {/* Health Vitals - MOVED TO TOP */}
                            <View style={[styles.modalSection, { marginTop: 0 }]}>
                                <Text style={styles.modalSectionTitle}>Critical Health Vitals</Text>
                                <View style={styles.vitalsGrid}>
                                    <View style={[styles.vitalBox, { flex: 1.5, backgroundColor: (selectedPatient?.bp_status === 'High' || selectedPatient?.bp_status === 'Critical') ? '#FFF5F5' : '#F9FAFB' }]}>
                                        <FontAwesome5 name="heartbeat" size={20} color={selectedPatient?.bp_status === 'High' ? "#FF5252" : "#4CAF50"} />
                                        <Text style={[styles.vitalValue, { color: selectedPatient?.bp_status === 'High' ? "#FF5252" : "#333", fontSize: 18 }]}>{selectedPatient?.bp_status || 'N/A'}</Text>
                                        <Text style={styles.vitalLabel}>Blood Pressure</Text>
                                    </View>
                                    <View style={[styles.vitalBox, { flex: 1.5, backgroundColor: selectedPatient?.sugar_status === 'High' ? '#FFF9F0' : '#F9FAFB' }]}>
                                        <FontAwesome5 name="tint" size={20} color={selectedPatient?.sugar_status === 'High' ? "#FF9800" : "#4CAF50"} />
                                        <Text style={[styles.vitalValue, { color: selectedPatient?.sugar_status === 'High' ? "#FF9800" : "#333", fontSize: 18 }]}>{selectedPatient?.sugar_status || 'N/A'}</Text>
                                        <Text style={styles.vitalLabel}>Sugar Status</Text>
                                    </View>
                                </View>
                                <View style={[styles.vitalsGrid, { marginTop: 15 }]}>
                                    <View style={styles.vitalBox}>
                                        <FontAwesome5 name="calculator" size={16} color="#607D8B" />
                                        <Text style={styles.vitalValue}>{selectedPatient?.bmi || 'N/A'}</Text>
                                        <Text style={styles.vitalLabel}>BMI</Text>
                                    </View>
                                    <View style={styles.vitalBox}>
                                        <FontAwesome5 name="ruler-vertical" size={16} color="#607D8B" />
                                        <Text style={styles.vitalValue}>{selectedPatient?.height ? `${selectedPatient.height}cm` : 'N/A'}</Text>
                                        <Text style={styles.vitalLabel}>Height</Text>
                                    </View>
                                    <View style={styles.vitalBox}>
                                        <FontAwesome5 name="weight" size={16} color="#607D8B" />
                                        <Text style={styles.vitalValue}>{selectedPatient?.weight ? `${selectedPatient.weight}kg` : 'N/A'}</Text>
                                        <Text style={styles.vitalLabel}>Weight</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Contact Actions */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalActionBtn, { backgroundColor: '#4CAF50' }]}
                                    onPress={() => handleCall(selectedPatient?.phone)}
                                >
                                    <MaterialIcons name="call" size={20} color="white" />
                                    <Text style={styles.modalActionText}>Call Patient Now</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Patient Basic Info */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Patient Profile</Text>
                                <View style={styles.infoBox}>
                                    <View style={styles.infoItem}>
                                        <MaterialIcons name="person" size={18} color="#666" style={{ width: 25 }} />
                                        <Text style={styles.infoText}>{selectedPatient?.name}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <MaterialIcons name="info" size={18} color="#666" style={{ width: 25 }} />
                                        <Text style={styles.infoText}>{selectedPatient?.gender || 'N/A'} • {selectedPatient?.age || 'N/A'} years old</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <MaterialIcons name="phone" size={18} color="#666" style={{ width: 25 }} />
                                        <Text style={styles.infoText}>{selectedPatient?.phone}</Text>
                                    </View>
                                    <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
                                        <MaterialIcons name="email" size={18} color="#666" style={{ width: 25 }} />
                                        <Text style={styles.infoText}>{selectedPatient?.email}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Lifestyle Profile */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Lifestyle & Habits</Text>
                                <View style={styles.infoBox}>
                                    <View style={styles.infoItem}>
                                        <MaterialIcons name="directions-run" size={18} color="#666" style={{ width: 25 }} />
                                        <Text style={styles.infoText}>Activity: {selectedPatient?.activity_level || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <MaterialIcons name="smoking-rooms" size={18} color="#666" style={{ width: 25 }} />
                                        <Text style={styles.infoText}>Smoking: {selectedPatient?.smoking || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <MaterialIcons name="local-bar" size={18} color="#666" style={{ width: 25 }} />
                                        <Text style={styles.infoText}>Alcohol: {selectedPatient?.alcohol || 'N/A'}</Text>
                                    </View>
                                    <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
                                        <MaterialIcons name="bedtime" size={18} color="#666" style={{ width: 25 }} />
                                        <Text style={styles.infoText}>Sleep: {selectedPatient?.sleep_hours ? `${selectedPatient.sleep_hours}h` : 'N/A'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Risk Indicators */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>AI Risk Analysis</Text>
                                <View style={styles.riskGrid}>
                                    {[
                                        { label: 'Heart', value: selectedPatient?.heart_risk },
                                        { label: 'Diabetes', value: selectedPatient?.diabetes_risk },
                                        { label: 'Obesity', value: selectedPatient?.obesity_risk },
                                        { label: 'Hypertension', value: selectedPatient?.hypertension_risk }
                                    ].map((risk, idx) => (
                                        <View key={idx} style={styles.riskRow}>
                                            <Text style={styles.riskRowLabel}>{risk.label}</Text>
                                            <View style={[styles.riskBadge, { backgroundColor: getRiskBadgeColor(risk.value) }]}>
                                                <Text style={styles.riskBadgeText}>{risk.value || 'Unknown'}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                            {/* Risk Indicators section end */}

                            {/* Record Information */}
                            <View style={[styles.modalSection, { marginTop: 10 }]}>
                                <Text style={styles.modalSectionTitle}>System Record Information</Text>
                                <View style={[styles.infoBox, { backgroundColor: '#F8F9FA' }]}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.recordLabel}>Patient ID:</Text>
                                        <Text style={styles.recordValue}>#HS-{selectedPatient?.id?.toString().padStart(4, '0')}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.recordLabel}>Registered On:</Text>
                                        <Text style={styles.recordValue}>{selectedPatient?.registered_at ? new Date(selectedPatient.registered_at).toLocaleDateString() : 'N/A'}</Text>
                                    </View>
                                    <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
                                        <Text style={styles.recordLabel}>Last Verified:</Text>
                                        <Text style={styles.recordValue}>{selectedPatient?.last_assessment_date ? new Date(selectedPatient.last_assessment_date).toLocaleString() : 'N/A'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Recommendations if any */}
                            {selectedPatient?.recommendations && (
                                <View style={styles.modalSection}>
                                    <View style={styles.recommendationBox}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                            <MaterialIcons name="lightbulb" size={20} color="#FF9800" />
                                            <Text style={styles.recTitle}>AI Recommendations</Text>
                                        </View>
                                        {Array.isArray(selectedPatient.recommendations) ? (
                                            selectedPatient.recommendations.map((rec, i) => (
                                                <Text key={i} style={styles.recText}>• {rec}</Text>
                                            ))
                                        ) : (
                                            <Text style={styles.recText}>{selectedPatient.recommendations}</Text>
                                        )}
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Health Checkup</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.formLabel}>Height (cm)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={editForm.height}
                                onChangeText={(text) => setEditForm({ ...editForm, height: text })}
                                keyboardType="numeric"
                            />

                            <Text style={styles.formLabel}>Weight (kg)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={editForm.weight}
                                onChangeText={(text) => setEditForm({ ...editForm, weight: text })}
                                keyboardType="numeric"
                            />

                            <Text style={styles.formLabel}>Blood Pressure</Text>
                            <View style={styles.pickerContainer}>
                                {['Normal', 'High', 'Low', 'Critical'].map((v) => (
                                    <TouchableOpacity 
                                        key={v}
                                        style={[styles.pickerBtn, editForm.bp_status === v && styles.pickerBtnActive]}
                                        onPress={() => setEditForm({ ...editForm, bp_status: v })}
                                    >
                                        <Text style={[styles.pickerBtnText, editForm.bp_status === v && styles.pickerBtnTextActive]}>{v}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Sugar Status</Text>
                            <View style={styles.pickerContainer}>
                                {['Normal', 'High', 'Low'].map((v) => (
                                    <TouchableOpacity 
                                        key={v}
                                        style={[styles.pickerBtn, editForm.sugar_status === v && styles.pickerBtnActive]}
                                        onPress={() => setEditForm({ ...editForm, sugar_status: v })}
                                    >
                                        <Text style={[styles.pickerBtnText, editForm.sugar_status === v && styles.pickerBtnTextActive]}>{v}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity 
                                style={[styles.submitBtn, updatingHealth && { opacity: 0.7 }]} 
                                onPress={handleUpdateHealth}
                                disabled={updatingHealth}
                            >
                                {updatingHealth ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Save Assessment & Call AI</Text>
                                )}
                            </TouchableOpacity>

                            <View style={[styles.modalSection, { marginTop: 30, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 20 }]}>
                                <Text style={styles.modalSectionTitle}>Daily Activity Prescription</Text>
                                
                                <View style={styles.activityForm}>
                                    <TextInput
                                        style={[styles.formInput, { flex: 2 }]}
                                        placeholder="Activity (e.g. Morning Walk)"
                                        value={newActivity}
                                        onChangeText={setNewActivity}
                                    />
                                    <TextInput
                                        style={[styles.formInput, { flex: 1, marginLeft: 10 }]}
                                        placeholder="Time (08:30)"
                                        value={activityTime}
                                        onChangeText={setActivityTime}
                                        maxLength={5}
                                    />
                                    <TouchableOpacity 
                                        style={styles.addActivityBtn}
                                        onPress={handlePrescribeActivity}
                                        disabled={prescribing}
                                    >
                                        <MaterialIcons name="add" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.activityList}>
                                    {patientActivities.map((act) => (
                                        <View key={act.id} style={styles.activityItem}>
                                            <MaterialIcons name="access-time" size={18} color="#4CAF50" />
                                            <Text style={styles.activityTimeText}>{act.scheduled_time}</Text>
                                            <Text style={styles.activityNameText}>{act.activity_name}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveActivity(act.id)}>
                                                <MaterialIcons name="delete-outline" size={20} color="#FF5252" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {patientActivities.length === 0 && (
                                        <Text style={styles.emptyActivityText}>No activities prescribed yet.</Text>
                                    )}
                                </View>
                            </View>

                            <View style={{ height: 100 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FBFBFB',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 25,
        paddingBottom: 25,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcome: {
        fontSize: 14,
        color: '#9E9E9E',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1A1A1A',
        marginTop: 2,
    },
    logoutBtn: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFEBEB',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingVertical: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F0F0F0',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        borderRightWidth: 1,
        borderColor: '#F0F0F0',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statusCard: {
        margin: 20,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    statusSub: {
        fontSize: 13,
        color: '#999',
        marginTop: 3,
    },
    searchCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#EEE',
        overflow: 'hidden',
    },
    searchInput: {
        flex: 1,
        padding: 15,
        fontSize: 16,
    },
    searchBtn: {
        backgroundColor: '#4CAF50',
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchResult: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#F1F8E9',
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    resName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    resEmail: {
        fontSize: 12,
        color: '#666',
    },
    updateBtn: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    updateBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    dietShortcut: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2F1',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#B2DFDB',
    },
    dietShortcutText: {
        flex: 1,
        color: '#00796B',
        fontWeight: '800',
        marginLeft: 10,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginTop: 15,
        marginBottom: 8,
    },
    formInput: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pickerBtn: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    pickerBtnActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    pickerBtnText: {
        fontSize: 13,
        color: '#666',
    },
    pickerBtnTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    submitBtn: {
        backgroundColor: '#4CAF50',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 30,
        elevation: 3,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    activityForm: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    addActivityBtn: {
        width: 45,
        height: 45,
        borderRadius: 10,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    activityList: {
        backgroundColor: '#F9FAFB',
        borderRadius: 15,
        padding: 10,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    activityTimeText: {
        width: 50,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginLeft: 8,
    },
    activityNameText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        marginLeft: 10,
    },
    emptyActivityText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 13,
        padding: 15,
    },
    locCard: {
        marginHorizontal: 20,
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    locIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    locLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    locValue: {
        fontSize: 15,
        color: 'white',
        fontWeight: '600',
    },
    section: {
        padding: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 15,
    },
    infoBox: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 5,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    infoText: {
        fontSize: 15,
        color: '#444',
        fontWeight: '500',
    },
    queueSection: {
        paddingHorizontal: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    alertBadge: {
        backgroundColor: '#FF5252',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    alertBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    queueContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FFEBEB',
    },
    queueItem: {
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#FBFBFB',
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF5252',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    queueText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '700',
    },
    queueSub: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyQueue: {
        color: '#BBB',
        fontSize: 14,
        marginTop: 10,
        fontWeight: '500',
    },
    riskSmallBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 5,
    },
    riskText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0F9F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '90%',
        padding: 25,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    patientHero: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        marginBottom: 20,
    },
    avatarLarge: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    heroName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111',
    },
    heroSub: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    modalActions: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    modalActionBtn: {
        flex: 1,
        height: 50,
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalActionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    modalSection: {
        marginBottom: 25,
    },
    modalSectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    vitalsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    vitalBox: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    vitalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
    },
    vitalLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    riskGrid: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    riskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
        marginHorizontal: 10,
    },
    riskRowLabel: {
        fontSize: 14,
        color: '#444',
        fontWeight: '500',
    },
    riskBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    riskBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    recordLabel: {
        fontSize: 13,
        color: '#999',
        fontWeight: '500',
    },
    recordValue: {
        fontSize: 13,
        color: '#444',
        fontWeight: 'bold',
    },
    recommendationBox: {
        backgroundColor: '#FFF9C4',
        padding: 20,
        borderRadius: 20,
    },
    recTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F57F17',
        marginLeft: 8,
    },
    recText: {
        fontSize: 14,
        color: '#5D4037',
        marginBottom: 5,
        lineHeight: 20,
    },
    closeBtn: {
        backgroundColor: '#F5F5F5',
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    closeBtnText: {
        fontSize: 16,
        color: '#666',
        fontWeight: 'bold',
    }
});
