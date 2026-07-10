import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Callout, MapView, Marker } from '../components/CustomMapView';
import { API_URL } from '../constants/config';

const { width, height } = Dimensions.get('window');

export default function NearbyDoctorsScreen() {
    const router = useRouter();
    const [userLocation, setUserLocation] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sosLoading, setSosLoading] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        setup();
    }, []);

    const setup = async () => {
        try {
            // Get user profile for smart sorting (from cache, fast)
            const profileStr = await AsyncStorage.getItem('user_profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                setUserProfile(profile);
            }

            // Request location permission
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to find nearby doctors.');
                setLoading(false);
                return;
            }

            // Get current location with lower accuracy for faster response
            let loc;
            try {
                loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced, // Faster than High accuracy
                });
            } catch (e) {
                console.warn('Current location unavailable, trying last known position:', e);
                loc = await Location.getLastKnownPositionAsync({});
            }

            if (!loc) {
                throw new Error('Could not determine location. Please ensure location services are enabled.');
            }

            setUserLocation(loc.coords);

            // Fetch doctors immediately after getting location
            await fetchNearbyDoctors(loc.coords, profileStr ? JSON.parse(profileStr) : null);
        } catch (e) {
            console.error('Setup error:', e);
            setErrorMsg(`Setup Error: ${e.message}`);
            Alert.alert('Error', 'Failed to get your location. Please check your GPS settings.');
            setLoading(false);
        }
    };

    const fetchNearbyDoctors = async (coords, profile = userProfile) => {
        try {
            const user_id = profile?.id || '';
            const url = `${API_URL}/doctors/nearby?lat=${coords.latitude}&lon=${coords.longitude}&user_id=${user_id}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch doctors');
            }

            const data = await response.json();
            setDoctors(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Fetch error:', e);
            setErrorMsg(`Fetch Error: ${e.message} (URL: ${url})`);
            Alert.alert('Error', 'Failed to fetch nearby doctors. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const triggerDoctorAlert = async (doctor) => {
        if (!userLocation) {
            Alert.alert("Error", "Location is required to send alerts.");
            return;
        }
        setSosLoading(true);
        try {
            const response = await fetch(`${API_URL}/emergency/sos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userProfile?.id,
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    doctor_id: doctor.id
                })
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert("Alert Sent", data.message || `Dr. ${doctor.name} has been notified successfully.`);
            } else {
                Alert.alert("Failed", data.message || "Failed to notify the doctor.");
            }
        } catch (e) {
            console.error('Trigger alert error:', e);
            Alert.alert("Error", "Could not connect to emergency services");
        } finally {
            setSosLoading(false);
        }
    };

    const handleSelectDoctor = (doctor) => {
        Alert.alert(
            "Choose Doctor",
            `Would you like to connect with Dr. ${doctor.name}? Only this doctor will receive the notification.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "YES, CONNECT",
                    onPress: () => triggerDoctorAlert(doctor),
                }
            ]
        );
    };

    const handleSOS = async () => {
        if (!userLocation) return;
        if (doctors.length === 0) {
            Alert.alert("No Doctors Available", "There are no available doctors nearby to connect with.");
            return;
        }

        const nearestDoctor = doctors[0];
        Alert.alert(
            "Quick Connect",
            `Would you like to connect with the nearest doctor, Dr. ${nearestDoctor.name}? Only this doctor will receive the notification.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "YES, CONNECT",
                    onPress: () => triggerDoctorAlert(nearestDoctor),
                }
            ]
        );
    };

    const handleCall = (phone) => {
        if (!phone) {
            Alert.alert('Not Available', 'This doctor has not provided a contact number.');
            return;
        }
        Linking.openURL(`tel:${phone}`);
    };

    const renderDoctorItem = ({ item }) => (
        <TouchableOpacity style={styles.doctorItem} onPress={() => handleSelectDoctor(item)}>
            <View style={styles.doctorIcon}>
                <FontAwesome5 name="user-md" size={30} color="#2196F3" />
            </View>
            <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{item.name}</Text>
                <Text style={styles.doctorSpec}>{item.specialization}</Text>
                <Text style={styles.doctorHospital}>{item.hospital_name}</Text>
            </View>
            <View style={styles.doctorDistance}>
                <Text style={styles.distanceText}>{item.distance} km</Text>
                <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item.phone)}>
                    <MaterialIcons name="call" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Finding nearby doctors...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {Platform.OS !== 'web' && (
                <View style={styles.mapContainer}>
                    {userLocation && (
                        <MapView
                            style={styles.map}
                            initialRegion={{
                                latitude: userLocation.latitude,
                                longitude: userLocation.longitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                        >
                            <Marker
                                coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
                                title="You are here"
                                pinColor="blue"
                            />
                            {doctors.map((doc, index) => (
                                <Marker
                                    key={index}
                                    coordinate={{
                                        latitude: parseFloat(doc.latitude),
                                        longitude: parseFloat(doc.longitude)
                                    }}
                                    title={doc.name}
                                    description={doc.specialization}
                                >
                                    <Callout>
                                        <View style={{ padding: 10, minWidth: 150 }}>
                                            <Text style={{ fontWeight: 'bold' }}>{doc.name}</Text>
                                            <Text>{doc.specialization}</Text>
                                            <Text style={{ color: '#666', fontSize: 10 }}>{doc.hospital_name}</Text>
                                        </View>
                                    </Callout>
                                </Marker>
                            ))}
                        </MapView>
                    )}
                    <TouchableOpacity style={styles.sosButton} onPress={handleSOS} disabled={sosLoading}>
                        {sosLoading ? <ActivityIndicator color="white" /> : <Text style={styles.sosText}>TO CONNECT</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {Platform.OS === 'web' && (
                <View style={styles.webHeader}>
                    <MaterialIcons name="location-on" size={40} color="#2196F3" />
                    <Text style={styles.webHeaderText}>Nearby Doctors</Text>
                    <Text style={styles.webHeaderSubtext}>
                        {errorMsg ? <Text style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</Text> : userLocation ? `Found ${doctors.length} doctors within 10km` : 'Getting your location...'}
                    </Text>
                    <TouchableOpacity style={styles.webSosButton} onPress={handleSOS} disabled={sosLoading}>
                        {sosLoading ? <ActivityIndicator color="white" /> : <Text style={styles.sosText}>QUICK CONNECT </Text>}
                    </TouchableOpacity>x
                </View>
            )}

            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Nearby Available Doctors</Text>
                    {userProfile?.bp_status === 'High' || userProfile?.sugar_status === 'High' ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Smart Sorted for you</Text>
                        </View>
                    ) : null}
                </View>
                <FlatList
                    data={doctors}
                    renderItem={renderDoctorItem}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No available doctors found within 10km.</Text>}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    mapContainer: {
        height: height * 0.45,
        width: '100%',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    sosButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#D32F2F',
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    sosText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    listContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -20,
        padding: 20,
        elevation: 5,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    badge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 10,
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    doctorItem: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#F8F9FA',
        borderRadius: 15,
        marginBottom: 12,
        alignItems: 'center',
    },
    doctorIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    doctorInfo: {
        flex: 1,
        marginLeft: 15,
    },
    doctorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    doctorSpec: {
        fontSize: 13,
        color: '#2196F3',
        fontWeight: '500',
    },
    doctorHospital: {
        fontSize: 12,
        color: '#777',
    },
    doctorDistance: {
        alignItems: 'flex-end',
    },
    distanceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 5,
    },
    callBtn: {
        backgroundColor: '#4CAF50',
        padding: 8,
        borderRadius: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 50,
    },
    webHeader: {
        backgroundColor: 'white',
        padding: 30,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    webHeaderText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
    },
    webHeaderSubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
        marginBottom: 15,
    },
    webSosButton: {
        backgroundColor: '#D32F2F',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 10,
    },
});

