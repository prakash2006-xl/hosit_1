import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    Dimensions,
    Linking,
    Vibration
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer } from 'expo-sensors';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../constants/config';

export default function GuardianScreen() {
    const router = useRouter();
    const [userProfile, setUserProfile] = useState({});
    
    // Config states
    const [contacts, setContacts] = useState([]);
    const [eventHistory, setEventHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Settings Panel Controls
    const [shakeEnabled, setShakeEnabled] = useState(false);
    const [call108Enabled, setCall108Enabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(true);
    const [sirenEnabled, setSirenEnabled] = useState(true);
    const [flashlightEnabled, setFlashlightEnabled] = useState(true);
    const [vibrateEnabled, setVibrateEnabled] = useState(true);
    const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
    
    const [securityPin, setSecurityPin] = useState('1234');
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const [newContactRelation, setNewContactRelation] = useState('');

    // Trigger & Countdown state
    const [isTriggered, setIsTriggered] = useState(false);
    const [triggerType, setTriggerType] = useState('Manual');
    const [countdown, setCountdown] = useState(10);
    const [cancelProgress, setCancelProgress] = useState(0);

    // Active Emergency States
    const [activeEvent, setActiveEvent] = useState(null);
    const [auditLog, setAuditLog] = useState([]);
    const [sirenSound, setSirenSound] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [screenFlashColor, setScreenFlashColor] = useState('transparent');

    const countdownIntervalRef = useRef(null);
    const trackingIntervalRef = useRef(null);
    const flashIntervalRef = useRef(null);
    const accelerometerSubscriptionRef = useRef(null);
    const cancelPressRef = useRef(null);

    useEffect(() => {
        loadData();
        return () => {
            stopAllEmergencyMechanisms();
            unsubscribeAccelerometer();
        };
    }, []);

    // Toggle shake detection on settings change
    useEffect(() => {
        if (shakeEnabled) {
            subscribeAccelerometer();
        } else {
            unsubscribeAccelerometer();
        }
    }, [shakeEnabled]);

    const loadData = async () => {
        try {
            setLoading(true);
            const savedProfile = await AsyncStorage.getItem('user_profile') || await AsyncStorage.getItem('user_profile_guest');
            const parsedProfile = savedProfile ? JSON.parse(savedProfile) : {};
            setUserProfile(parsedProfile);

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

            const savedPin = await AsyncStorage.getItem('guardian_pin');
            if (savedPin) setSecurityPin(savedPin);

            // Fetch emergency contacts & logs from backend or local storage
            if (parsedProfile.id && parsedProfile.id !== 0) {
                await fetchContacts(parsedProfile.id);
                await fetchEventHistory(parsedProfile.id);
            } else {
                await fetchContacts(0);
                await fetchEventHistory(0);
            }
        } catch (e) {
            console.error('Load data fail', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchContacts = async (userId) => {
        try {
            if (!userId || userId === 0) {
                const localContacts = await AsyncStorage.getItem('local_emergency_contacts');
                setContacts(localContacts ? JSON.parse(localContacts) : []);
                return;
            }
            const res = await fetch(`${API_URL}/emergency/contacts?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setContacts(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchEventHistory = async (userId) => {
        try {
            if (!userId || userId === 0) {
                const savedEvents = await AsyncStorage.getItem('local_emergency_events');
                const parsedEvents = savedEvents ? JSON.parse(savedEvents) : [];
                setEventHistory(parsedEvents);

                // Auto-restore any active emergency from local storage
                const activeStr = await AsyncStorage.getItem('local_active_emergency');
                if (activeStr) {
                    const active = JSON.parse(activeStr);
                    setActiveEvent({
                        id: active.event_id,
                        user_id: active.user_id,
                        event_date: active.event_date,
                        event_time: active.event_time,
                        trigger_type: active.trigger_type,
                        location: active.location,
                        contacts_notified: active.contacts_notified,
                        call_108_status: active.call_108_status,
                        status: 'Active',
                        latitude: active.latitude,
                        longitude: active.longitude,
                        battery_percentage: active.battery_percentage
                    });

                    try {
                        const parsed = JSON.parse(active.audit_trail || '[]');
                        setAuditLog(parsed);
                    } catch (e) {
                        setAuditLog([{ timestamp: active.event_time, event: "Restored active emergency." }]);
                    }

                    // Resume alert devices
                    if (sirenEnabled) startSiren();
                    if (flashlightEnabled) startFlashlightSOS();
                    if (vibrateEnabled) startVibrationSOS();
                    if (locationSharingEnabled) startLiveTracking(active.event_id);
                }
                return;
            }

            const res = await fetch(`${API_URL}/emergency/events/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setEventHistory(data);

                // Auto-restore any active emergency
                const active = data.find(ev => ev.status === 'Active');
                if (active) {
                    setActiveEvent({
                        id: active.event_id,
                        user_id: active.user_id,
                        event_date: active.event_date,
                        event_time: active.event_time,
                        trigger_type: active.trigger_type,
                        location: active.location,
                        contacts_notified: active.contacts_notified,
                        call_108_status: active.call_108_status,
                        status: 'Active',
                        latitude: active.latitude,
                        longitude: active.longitude,
                        battery_percentage: active.battery_percentage
                    });

                    try {
                        const parsed = JSON.parse(active.audit_trail || '[]');
                        setAuditLog(parsed);
                    } catch (e) {
                        setAuditLog([{ timestamp: active.event_time, event: "Restored active emergency." }]);
                    }

                    // Resume alert devices
                    if (sirenEnabled) startSiren();
                    if (flashlightEnabled) startFlashlightSOS();
                    if (vibrateEnabled) startVibrationSOS();
                    if (locationSharingEnabled) startLiveTracking(active.event_id);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const saveSetting = async (key, val) => {
        try {
            await AsyncStorage.setItem(key, String(val));
        } catch (e) {
            console.error(e);
        }
    };

    // Accelerometer & Shake Detection
    const subscribeAccelerometer = () => {
        Accelerometer.setUpdateInterval(150);
        let lastX = 0, lastY = 0, lastZ = 0;
        let lastTime = Date.now();

        accelerometerSubscriptionRef.current = Accelerometer.addListener(data => {
            const { x, y, z } = data;
            const currentTime = Date.now();
            const timeDiff = currentTime - lastTime;

            if (timeDiff > 100) {
                const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / timeDiff * 10000;
                
                // If velocity threshold is breached (violent shake)
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
    };

    const unsubscribeAccelerometer = () => {
        if (accelerometerSubscriptionRef.current) {
            accelerometerSubscriptionRef.current.remove();
            accelerometerSubscriptionRef.current = null;
        }
    };

    // Countdown triggers
    const triggerCountdown = (type = 'Manual') => {
        if (isTriggered || activeEvent) return;
        setTriggerType(type);
        setIsTriggered(true);
        setCountdown(10);
        setCancelProgress(0);

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

    const startCancelTimer = () => {
        cancelPressRef.current = setInterval(() => {
            setCancelProgress(prev => {
                if (prev >= 1) {
                    clearInterval(cancelPressRef.current);
                    cancelEmergency();
                    return 1;
                }
                return prev + 0.1;
            });
        }, 100);
    };

    const stopCancelTimer = () => {
        if (cancelPressRef.current) {
            clearInterval(cancelPressRef.current);
            setCancelProgress(0);
        }
    };

    const cancelEmergency = async () => {
        clearInterval(countdownIntervalRef.current);
        setIsTriggered(false);
        setCancelProgress(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const now = new Date();
        const eventId = `EMG-${now.getTime()}`;
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();

        try {
            await fetch(`${API_URL}/emergency/event/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: eventId,
                    user_id: userProfile.id || 0,
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
            if (userProfile.id) fetchEventHistory(userProfile.id);
        } catch (e) {}
        Alert.alert("SOS Cancelled", "Emergency alarm aborted successfully.");
    };

    // Active Emergency workflow
    const executeEmergencyAction = async () => {
        setIsTriggered(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        const now = new Date();
        const eventId = `EMG-${now.getTime()}`;
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();

        const initialLog = [
            { timestamp: timeStr, event: `Emergency event initialized via ${triggerType} trigger.` }
        ];

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
                    initialLog.push({ timestamp: timeStr, event: `GPS Location retrieved: ${locationStr}` });
                } else {
                    initialLog.push({ timestamp: timeStr, event: `GPS Permission Denied. Using fallback.` });
                }
            } catch (e) {
                initialLog.push({ timestamp: timeStr, event: `GPS Fetch failed, using fallback.` });
            }
        } else {
            initialLog.push({ timestamp: timeStr, event: `GPS tracking disabled by user settings.` });
        }

        // 108 Dialer routing
        let callStatus108 = 'Skipped';
        if (call108Enabled) {
            callStatus108 = 'Called';
            initialLog.push({ timestamp: timeStr, event: "Initiating call to 108 Ambulance Service..." });
            Linking.openURL('tel:108').catch(() => {
                initialLog.push({ timestamp: timeStr, event: `Auto-dialer opened with 108 prefilled.` });
            });
        }

        // Distress SMS
        let notifiedCount = 0;
        if (smsEnabled && contacts.length > 0) {
            notifiedCount = contacts.length;
            const smsContent = `🚨 EMERGENCY ALERT 🚨\n\n${userProfile.name || 'Patient'} may be in danger and requires immediate assistance.\n\nTime: ${timeStr}\n\nLive Location: ${mapsLink}\n\nPlease contact the patient immediately or reach the location as soon as possible.`;

            contacts.forEach(c => {
                initialLog.push({ timestamp: timeStr, event: `SMS alert dispatched to ${c.name} (${c.phone})` });
                Linking.openURL(`sms:${c.phone}?body=${encodeURIComponent(smsContent)}`).catch(() => {});
            });
        }

        const newEvent = {
            id: eventId,
            user_id: userProfile.id,
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
        };

        setActiveEvent(newEvent);
        setAuditLog(initialLog);

        // Save Event to database
        try {
            await fetch(`${API_URL}/emergency/event/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: eventId,
                    user_id: userProfile.id || 0,
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

        // Loop siren sound
        if (sirenEnabled) {
            startSiren();
            initialLog.push({ timestamp: timeStr, event: "Emergency Siren activated." });
        }

        // Start flashlight SOS simulation
        if (flashlightEnabled) {
            startFlashlightSOS();
            initialLog.push({ timestamp: timeStr, event: "SOS flashlight sequence initialized." });
        }

        // Start Continuous Vibration
        if (vibrateEnabled) {
            startVibrationSOS();
            initialLog.push({ timestamp: timeStr, event: "Continuous device vibration started." });
        }

        // Start live location updates
        if (locationSharingEnabled) {
            startLiveTracking(eventId);
        }

        setAuditLog([...initialLog]);
    };

    const startSiren = async () => {
        try {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: true });
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://www.soundjay.com/mechanical/siren-1.mp3' },
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
            setSirenSound(sound);
        } catch (e) {}
    };

    const stopSiren = async () => {
        if (sirenSound) {
            try {
                await sirenSound.stopAsync();
                await sirenSound.unloadAsync();
                setSirenSound(null);
            } catch (e) {}
        }
    };

    const startFlashlightSOS = () => {
        let isLit = false;
        flashIntervalRef.current = setInterval(() => {
            isLit = !isLit;
            setScreenFlashColor(isLit ? '#FFFFFF' : '#1A0000');
        }, 300);
    };

    const stopFlashlightSOS = () => {
        clearInterval(flashIntervalRef.current);
        setScreenFlashColor('transparent');
    };

    const startVibrationSOS = () => {
        Vibration.vibrate([0, 500, 500], true);
    };

    const stopVibrationSOS = () => {
        Vibration.cancel();
    };

    const startLiveTracking = (eventId) => {
        trackingIntervalRef.current = setInterval(async () => {
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                let batteryLvl = 100;
                try {
                    batteryLvl = Math.round((await Battery.getBatteryLevelAsync()) * 100);
                } catch (e) {}

                const locationStr = `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`;
                const timeStr = new Date().toLocaleTimeString();
                const milestoneText = `Live GPS Update: ${locationStr}`;

                if (userProfile.id && userProfile.id !== 0) {
                    await fetch(`${API_URL}/emergency/event/update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            event_id: eventId,
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                            location: locationStr,
                            battery_percentage: batteryLvl,
                            milestone: milestoneText
                        })
                    });
                } else {
                    const activeStr = await AsyncStorage.getItem('local_active_emergency');
                    if (activeStr) {
                        const activeObj = JSON.parse(activeStr);
                        activeObj.latitude = loc.coords.latitude;
                        activeObj.longitude = loc.coords.longitude;
                        activeObj.location = locationStr;
                        activeObj.battery_percentage = batteryLvl;
                        
                        const trail = JSON.parse(activeObj.audit_trail || '[]');
                        trail.push({ timestamp: timeStr, event: milestoneText });
                        activeObj.audit_trail = JSON.stringify(trail);
                        
                        await AsyncStorage.setItem('local_active_emergency', JSON.stringify(activeObj));
                    }
                }

                setAuditLog(prev => [
                    ...prev,
                    { timestamp: timeStr, event: `Live GPS Sync: ${locationStr}` }
                ]);
            } catch (e) {}
        }, 30000);
    };

    const stopLiveTracking = () => {
        clearInterval(trackingIntervalRef.current);
    };

    const stopAllEmergencyMechanisms = async () => {
        stopLiveTracking();
        await stopSiren();
        stopFlashlightSOS();
        stopVibrationSOS();
    };

    const handleResolveRequest = () => {
        setPinModalVisible(true);
    };

    const submitPinResolution = async () => {
        if (pinInput === securityPin) {
            setPinModalVisible(false);
            setPinInput('');
            
            await stopAllEmergencyMechanisms();

            const finalLogText = "Emergency marked completed by patient.";
            setAuditLog(prev => [
                ...prev,
                { timestamp: new Date().toLocaleTimeString(), event: finalLogText }
            ]);

            if (userProfile.id && userProfile.id !== 0) {
                try {
                    await fetch(`${API_URL}/emergency/event/update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            event_id: activeEvent.id,
                            status: 'Completed',
                            milestone: finalLogText
                        })
                    });
                    fetchEventHistory(userProfile.id);
                } catch (e) {
                    console.error(e);
                }
            } else {
                try {
                    const activeStr = await AsyncStorage.getItem('local_active_emergency');
                    if (activeStr) {
                        const activeObj = JSON.parse(activeStr);
                        activeObj.status = 'Completed';
                        
                        const trail = JSON.parse(activeObj.audit_trail || '[]');
                        trail.push({ timestamp: new Date().toLocaleTimeString(), event: finalLogText });
                        activeObj.audit_trail = JSON.stringify(trail);

                        const savedEvents = await AsyncStorage.getItem('local_emergency_events');
                        const parsedEvents = savedEvents ? JSON.parse(savedEvents) : [];
                        parsedEvents.push(activeObj);
                        
                        await AsyncStorage.setItem('local_emergency_events', JSON.stringify(parsedEvents));
                        await AsyncStorage.removeItem('local_active_emergency');
                    }
                    fetchEventHistory(0);
                } catch (e) {
                    console.error(e);
                }
            }

            Alert.alert("SOS Resolved", "Emergency resolved successfully.");
            setActiveEvent(null);
        } else {
            Alert.alert("Incorrect PIN", "Pin code validation failed.");
            setPinInput('');
        }
    };

    // Contacts CRUD
    const handleAddContact = async () => {
        if (contacts.length >= 5) {
            Alert.alert("Limit Reached", "You can configure a maximum of 5 emergency contacts.");
            return;
        }
        if (!newContactName || !newContactPhone || !newContactRelation) {
            Alert.alert("Incomplete fields", "All fields are required.");
            return;
        }

        // Phone number validation: digits or starts with +
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(newContactPhone)) {
            Alert.alert("Validation Error", "Please enter a valid phone number (10-15 digits).");
            return;
        }

        // Duplicate phone check
        const isDuplicate = contacts.some(c => c.phone === newContactPhone);
        if (isDuplicate) {
            Alert.alert("Duplicate Contact", "This phone number is already registered.");
            return;
        }

        if (!userProfile.id || userProfile.id === 0) {
            try {
                const newContact = {
                    id: Date.now(),
                    user_id: 0,
                    name: newContactName,
                    phone: newContactPhone,
                    relation: newContactRelation
                };
                const updatedContacts = [...contacts, newContact];
                setContacts(updatedContacts);
                await AsyncStorage.setItem('local_emergency_contacts', JSON.stringify(updatedContacts));
                setNewContactName('');
                setNewContactPhone('');
                setNewContactRelation('');
            } catch (e) {
                console.error(e);
                Alert.alert("Error", "Could not save emergency contact locally.");
            }
            return;
        }

        try {
            const res = await fetch(`${API_URL}/emergency/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userProfile.id,
                    name: newContactName,
                    phone: newContactPhone,
                    relation: newContactRelation
                })
            });
            if (res.ok) {
                setNewContactName('');
                setNewContactPhone('');
                setNewContactRelation('');
                fetchContacts(userProfile.id);
            } else {
                Alert.alert("Error", "Could not add emergency contact.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteContact = async (id) => {
        if (!userProfile.id || userProfile.id === 0) {
            try {
                const updatedContacts = contacts.filter(c => c.id !== id);
                setContacts(updatedContacts);
                await AsyncStorage.setItem('local_emergency_contacts', JSON.stringify(updatedContacts));
            } catch (e) {
                console.error(e);
                Alert.alert("Error", "Could not delete emergency contact locally.");
            }
            return;
        }

        try {
            const res = await fetch(`${API_URL}/emergency/contacts/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchContacts(userProfile.id);
            } else {
                Alert.alert("Error", "Could not delete emergency contact.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#D32F2F" />
                <Text style={{ marginTop: 10 }}>Loading Guardian AI...</Text>
            </View>
        );
    }

    // Active Emergency Overlay
    if (activeEvent) {
        return (
            <View style={[styles.activeEmergencyContainer, { backgroundColor: screenFlashColor }]}>
                <View style={styles.activeEmergencyHeader}>
                    <View style={styles.pulseContainer}>
                        <View style={styles.pulseRing} />
                        <FontAwesome5 name="radiation" size={40} color="#D32F2F" />
                    </View>
                    <Text style={styles.activeEmergencyTitle}>EMERGENCY STATUS: ACTIVE</Text>
                    <Text style={styles.activeEmergencySubtitle}>Countdown Completed. SOS Initiated.</Text>
                </View>

                <View style={styles.activeStats}>
                    <View style={styles.statRow}>
                        <MaterialIcons name="my-location" size={20} color="#D32F2F" />
                        <Text style={styles.statVal}>Live Location: {activeEvent.location}</Text>
                    </View>
                    <View style={styles.statRow}>
                        <MaterialIcons name="sms" size={20} color="#D32F2F" />
                        <Text style={styles.statVal}>Contacts Notified: {activeEvent.contacts_notified}</Text>
                    </View>
                    <View style={styles.statRow}>
                        <MaterialIcons name="phone-in-talk" size={20} color="#D32F2F" />
                        <Text style={styles.statVal}>108 Call Status: {activeEvent.call_108_status}</Text>
                    </View>
                </View>

                <View style={styles.auditLogContainer}>
                    <Text style={styles.auditLogTitle}>Live Audit Trail Logs</Text>
                    <ScrollView style={{ flex: 1 }}>
                        {auditLog.map((log, index) => (
                            <View key={index} style={styles.auditLogItem}>
                                <Text style={styles.auditTime}>{log.timestamp}</Text>
                                <Text style={styles.auditText}>{log.event}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <TouchableOpacity style={styles.resolveButton} onPress={handleResolveRequest}>
                    <MaterialIcons name="lock-open" size={24} color="white" />
                    <Text style={styles.resolveButtonText}>END EMERGENCY</Text>
                </TouchableOpacity>

                {/* PIN validation modal */}
                <Modal visible={pinModalVisible} transparent={true} animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Resolve Security Verification</Text>
                            <Text style={styles.modalSub}>Enter your 4-digit Emergency PIN to terminate active alerts.</Text>
                            <TextInput
                                style={styles.pinInput}
                                value={pinInput}
                                onChangeText={setPinInput}
                                keyboardType="numeric"
                                secureTextEntry={true}
                                maxLength={4}
                                placeholder="PIN"
                            />
                            <View style={{ flexDirection: 'row', gap: 15, width: '100%', marginTop: 20 }}>
                                <TouchableOpacity style={[styles.pinBtn, { backgroundColor: '#ECEFF1' }]} onPress={() => setPinModalVisible(false)}>
                                    <Text style={{ color: '#37474F', fontWeight: 'bold' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.pinBtn, { backgroundColor: '#D32F2F' }]} onPress={submitPinResolution}>
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Verify & Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // Trigger Countdown Screen Overlay
    if (isTriggered) {
        return (
            <View style={styles.countdownContainer}>
                <Text style={styles.countdownWarning}>
                    {triggerType === 'Automatic' ? 'POSSIBLE EMERGENCY DETECTED' : 'EMERGENCY TRIGGER INITIATED'}
                </Text>
                <Text style={styles.countdownSubtitle}>Emergency will be triggered in {countdown} seconds.</Text>
                
                <View style={styles.countdownCircle}>
                    <Text style={styles.countdownNumber}>{countdown}</Text>
                    <Text style={{ color: 'white', fontSize: 14 }}>Seconds</Text>
                </View>

                <View style={{ width: '80%', alignItems: 'center', marginTop: 40 }}>
                    <Text style={styles.cancelPrompt}>Hold Abort Button to Cancel Emergency</Text>
                    
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${cancelProgress * 100}%` }]} />
                    </View>

                    <TouchableOpacity
                        style={styles.cancelHoldBtn}
                        onPressIn={startCancelTimer}
                        onPressOut={stopCancelTimer}
                    >
                        <MaterialIcons name="cancel" size={40} color="white" />
                        <Text style={styles.cancelHoldBtnText}>CANCEL SOS</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Default configuration screen
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            
            {/* Quick Trigger card */}
            <TouchableOpacity style={styles.manualSosBtn} onPress={() => {
                Alert.alert(
                    "Confirm Emergency SOS",
                    "Do you want to initiate distress alert signals?",
                    [
                        { text: "Abort", style: "cancel" },
                        { text: "Initiate SOS", style: "destructive", onPress: () => triggerCountdown('Manual') }
                    ]
                );
            }}>
                <View style={styles.sosRipple}>
                    <MaterialIcons name="warning" size={40} color="white" />
                    <Text style={styles.manualSosBtnText}>MANUAL SOS PANIC TRIGGER</Text>
                    <Text style={styles.manualSosSub}>Tap here to open immediate emergency confirmation dialog.</Text>
                </View>
            </TouchableOpacity>

            {/* Configurable Settings */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Emergency Settings</Text>
                
                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Automatic SOS Detection</Text>
                        <Text style={styles.configSub}>Monitor device sensors for distress triggers</Text>
                    </View>
                    <Switch
                        value={shakeEnabled}
                        onValueChange={async (val) => {
                            setShakeEnabled(val);
                            await saveSetting('guardian_shake_enabled', val);
                        }}
                    />
                </View>

                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Shake Detection</Text>
                        <Text style={styles.configSub}>Trigger countdown on sudden heavy movement</Text>
                    </View>
                    <Switch
                        value={shakeEnabled}
                        onValueChange={async (val) => {
                            setShakeEnabled(val);
                            await saveSetting('guardian_shake_enabled', val);
                        }}
                    />
                </View>

                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Auto Call 108</Text>
                        <Text style={styles.configSub}>Place call to 108 Ambulance service on trigger</Text>
                    </View>
                    <Switch
                        value={call108Enabled}
                        onValueChange={async (val) => {
                            setCall108Enabled(val);
                            await saveSetting('guardian_call_108_enabled', val);
                        }}
                    />
                </View>

                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Emergency SMS</Text>
                        <Text style={styles.configSub}>Dispatch alert message to distress contacts</Text>
                    </View>
                    <Switch
                        value={smsEnabled}
                        onValueChange={async (val) => {
                            setSmsEnabled(val);
                            await saveSetting('guardian_sms_enabled', val);
                        }}
                    />
                </View>

                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Siren</Text>
                        <Text style={styles.configSub}>Play high-volume warning sirens continuously</Text>
                    </View>
                    <Switch
                        value={sirenEnabled}
                        onValueChange={async (val) => {
                            setSirenEnabled(val);
                            await saveSetting('guardian_siren_enabled', val);
                        }}
                    />
                </View>

                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Flashlight SOS</Text>
                        <Text style={styles.configSub}>Emit visible flashing light beacon sequences</Text>
                    </View>
                    <Switch
                        value={flashlightEnabled}
                        onValueChange={async (val) => {
                            setFlashlightEnabled(val);
                            await saveSetting('guardian_flash_enabled', val);
                        }}
                    />
                </View>

                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Continuous Vibration</Text>
                        <Text style={styles.configSub}>Vibrate device heavily during alert execution</Text>
                    </View>
                    <Switch
                        value={vibrateEnabled}
                        onValueChange={async (val) => {
                            setVibrateEnabled(val);
                            await saveSetting('guardian_vibrate_enabled', val);
                        }}
                    />
                </View>

                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Live Location Sharing</Text>
                        <Text style={styles.configSub}>Share GPS link and update coordinates every 30s</Text>
                    </View>
                    <Switch
                        value={locationSharingEnabled}
                        onValueChange={async (val) => {
                            setLocationSharingEnabled(val);
                            await saveSetting('guardian_location_sharing_enabled', val);
                        }}
                    />
                </View>

                <View style={styles.configItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>Security Resolve PIN</Text>
                        <Text style={styles.configSub}>Enter 4 digits to stop active SOS alerts safely</Text>
                    </View>
                    <TextInput
                        style={styles.pinConfigInput}
                        value={securityPin}
                        maxLength={4}
                        keyboardType="numeric"
                        secureTextEntry={true}
                        onChangeText={async (text) => {
                            setSecurityPin(text);
                            await saveSetting('guardian_pin', text);
                        }}
                    />
                </View>
            </View>

            {/* Emergency Contacts */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Emergency Contacts ({contacts.length}/5)</Text>
                
                {contacts.map((contact, idx) => (
                    <View key={contact.id || idx} style={styles.contactItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.contactName}>{contact.name}</Text>
                            <Text style={styles.contactPhone}>{contact.phone} • {contact.relation}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteContact(contact.id)}>
                            <MaterialIcons name="delete-forever" size={24} color="#D32F2F" />
                        </TouchableOpacity>
                    </View>
                ))}

                {contacts.length === 0 && (
                    <Text style={styles.emptyText}>No emergency contacts configured yet.</Text>
                )}

                {contacts.length < 5 && (
                    <View style={styles.addContactForm}>
                        <Text style={styles.formSubTitle}>Add Emergency Contact</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contact Name"
                            value={newContactName}
                            onChangeText={setNewContactName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number (e.g. +919876543210)"
                            value={newContactPhone}
                            keyboardType="phone-pad"
                            onChangeText={setNewContactPhone}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Relationship (e.g. Brother, Parent)"
                            value={newContactRelation}
                            onChangeText={setNewContactRelation}
                        />
                        <TouchableOpacity style={styles.addContactBtn} onPress={handleAddContact}>
                            <MaterialIcons name="person-add" size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Save Contact</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* History logs */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Emergency History Log</Text>
                {eventHistory.map((item, idx) => (
                    <View key={item.id || idx} style={styles.historyItem}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.historyId}>{item.event_id}</Text>
                                <Text style={[styles.historyStatus, item.status === 'Completed' ? styles.statusGreen : styles.statusRed]}>
                                    {item.status}
                                </Text>
                            </View>
                            <Text style={styles.historySub}>
                                Trigger: {item.trigger_type} • Date: {item.event_date} {item.event_time}
                            </Text>
                            <Text style={styles.historyLoc}>
                                Location: {item.location} • Contacts SMS Notified: {item.contacts_notified}
                            </Text>
                            <Text style={styles.historyLoc}>
                                108 Call Status: {item.call_108_status}
                            </Text>
                        </View>
                    </View>
                ))}
                {eventHistory.length === 0 && (
                    <Text style={styles.emptyText}>No emergency records found.</Text>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    manualSosBtn: {
        backgroundColor: '#D32F2F',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 4,
    },
    sosRipple: {
        padding: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    manualSosBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10
    },
    manualSosSub: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 11,
        marginTop: 5,
        textAlign: 'center'
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#37474F',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 8
    },
    configItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ECEFF1'
    },
    configLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#263238'
    },
    configSub: {
        fontSize: 11,
        color: '#78909C',
        marginTop: 2,
        paddingRight: 15
    },
    pinConfigInput: {
        backgroundColor: '#ECEFF1',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 15,
        color: '#37474F',
        width: 80,
        textAlign: 'center'
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ECEFF1'
    },
    contactName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#37474F'
    },
    contactPhone: {
        fontSize: 13,
        color: '#78909C',
        marginTop: 2
    },
    addContactForm: {
        marginTop: 15,
        gap: 10
    },
    formSubTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#37474F',
        marginBottom: 5
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#CFD8DC',
        fontSize: 14
    },
    addContactBtn: {
        backgroundColor: '#263238',
        borderRadius: 8,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginTop: 5
    },
    historyItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ECEFF1'
    },
    historyId: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#263238'
    },
    historyStatus: {
        fontSize: 12,
        fontWeight: 'bold'
    },
    historySub: {
        fontSize: 11,
        color: '#78909C',
        marginTop: 4
    },
    historyLoc: {
        fontSize: 11,
        color: '#546E7A',
        marginTop: 2
    },
    statusGreen: {
        color: '#2E7D32'
    },
    statusRed: {
        color: '#C62828'
    },
    emptyText: {
        color: '#90A4AE',
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: 10
    },

    // Countdown Overlay
    countdownContainer: {
        flex: 1,
        backgroundColor: '#B71C1C',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30
    },
    countdownWarning: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    countdownSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 20
    },
    countdownCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 6,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.1)'
    },
    countdownNumber: {
        color: 'white',
        fontSize: 68,
        fontWeight: 'bold'
    },
    cancelPrompt: {
        color: 'white',
        fontSize: 13,
        marginBottom: 10
    },
    progressBarBg: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
        marginBottom: 20,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 3
    },
    cancelHoldBtn: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 2,
        borderColor: 'white',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        width: '100%',
        justifyContent: 'center'
    },
    cancelHoldBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },

    // Active Emergency overlay
    activeEmergencyContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 40
    },
    activeEmergencyHeader: {
        alignItems: 'center',
        marginTop: 10
    },
    pulseContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFEBEE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15
    },
    pulseRing: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#D32F2F',
        opacity: 0.5
    },
    activeEmergencyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#D32F2F',
        textAlign: 'center'
    },
    activeEmergencySubtitle: {
        fontSize: 13,
        color: '#546E7A',
        marginTop: 4
    },
    activeStats: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        gap: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    statVal: {
        fontSize: 14,
        color: '#37474F',
        fontWeight: '600'
    },
    auditLogContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginVertical: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    auditLogTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#263238',
        borderBottomWidth: 1,
        borderBottomColor: '#ECEFF1',
        paddingBottom: 8
    },
    auditLogItem: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
        alignItems: 'flex-start'
    },
    auditTime: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#D32F2F',
        width: 70
    },
    auditText: {
        fontSize: 12,
        color: '#37474F',
        flex: 1
    },
    resolveButton: {
        backgroundColor: '#C62828',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
        elevation: 3,
    },
    resolveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 25,
        alignItems: 'center',
        width: '100%',
        maxWidth: 350
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#263238',
        textAlign: 'center'
    },
    modalSub: {
        fontSize: 12,
        color: '#78909C',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20
    },
    pinInput: {
        backgroundColor: '#ECEFF1',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 10,
        textAlign: 'center',
        width: 150,
        color: '#263238'
    },
    pinBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    }
});
