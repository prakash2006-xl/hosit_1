import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SAMPLE_LABS } from '../constants/healthModulesData';

export default function LabProfileScreen() {
    const router = useRouter();
    const { labId } = useLocalSearchParams();
    const lab = useMemo(() => SAMPLE_LABS.find((item) => String(item.id) === String(labId)) || SAMPLE_LABS[0], [labId]);
    const [selectedTests, setSelectedTests] = useState([]);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    const total = selectedTests.reduce((sum, testId) => {
        const test = lab.tests.find((item) => item.id === testId);
        return sum + (test?.price || 0);
    }, 0);

    const toggleTest = (testId) => {
        setSelectedTests((prev) => (
            prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
        ));
    };

    const bookAppointment = async () => {
        if (selectedTests.length === 0) {
            Alert.alert('Select Tests', 'Please select at least one test.');
            return;
        }
        if (!date || !time) {
            Alert.alert('Choose Slot', 'Please enter appointment date and time.');
            return;
        }

        const profileStr = await AsyncStorage.getItem('user_profile');
        const profile = profileStr ? JSON.parse(profileStr) : {};
        const tests = lab.tests.filter((test) => selectedTests.includes(test.id));
        const appointment = {
            id: Date.now(),
            labId: lab.id,
            labName: lab.name,
            userId: profile.id || null,
            tests,
            date,
            time,
            total,
            status: 'Appointment Confirmed'
        };

        const existingRaw = await AsyncStorage.getItem('lab_appointments');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        await AsyncStorage.setItem('lab_appointments', JSON.stringify([appointment, ...existing]));

        const notificationsRaw = await AsyncStorage.getItem('patient_notifications');
        const notifications = notificationsRaw ? JSON.parse(notificationsRaw) : [];
        notifications.unshift({
            id: Date.now(),
            title: 'Appointment Confirmed',
            message: `${lab.name} confirmed ${tests.length} test(s) for ${date} at ${time}.`,
            type: 'lab',
            createdAt: new Date().toISOString()
        });
        await AsyncStorage.setItem('patient_notifications', JSON.stringify(notifications));

        Alert.alert('Confirmed', 'Lab appointment booked and patient notification saved.', [
            { text: 'OK', onPress: () => router.push('/dashboard') }
        ]);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.hero}>
                <View style={styles.logo}>
                    <MaterialIcons name="science" size={34} color="#7E57C2" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{lab.name}</Text>
                    <Text style={styles.meta}>Rating {lab.rating} | {lab.distance} km</Text>
                    <Text style={styles.meta}>{lab.openNow ? 'Open Now' : 'Closed'} | {lab.openingHours}</Text>
                </View>
            </View>

            <InfoSection title="Laboratory Information">
                <Text style={styles.bodyText}>{lab.description}</Text>
                <InfoRow icon="place" text={lab.address} />
                <InfoRow icon="phone" text={lab.contactNumber} />
                <InfoRow icon="home" text={`Home Collection: ${lab.homeCollection ? 'Yes' : 'No'}`} />
            </InfoSection>

            <InfoSection title="Available Tests and Price List">
                {lab.tests.map((test) => {
                    const active = selectedTests.includes(test.id);
                    return (
                        <TouchableOpacity
                            key={test.id}
                            style={[styles.testRow, active && styles.testRowActive]}
                            onPress={() => toggleTest(test.id)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.testName}>{test.name}</Text>
                                <Text style={styles.testTime}>Estimated result: {test.resultTime}</Text>
                            </View>
                            <Text style={styles.price}>Rs. {test.price}</Text>
                            <MaterialIcons name={active ? 'check-circle' : 'radio-button-unchecked'} size={24} color={active ? '#7E57C2' : '#AAA'} />
                        </TouchableOpacity>
                    );
                })}
            </InfoSection>

            <InfoSection title="Book Appointment">
                <TextInput
                    style={styles.input}
                    placeholder="Date (YYYY-MM-DD)"
                    value={date}
                    onChangeText={setDate}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Time (HH:MM)"
                    value={time}
                    onChangeText={setTime}
                />
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>Rs. {total}</Text>
                </View>
                <TouchableOpacity style={styles.confirmBtn} onPress={bookAppointment}>
                    <Text style={styles.confirmText}>Confirm Lab Appointment</Text>
                </TouchableOpacity>
            </InfoSection>
        </ScrollView>
    );
}

function InfoSection({ title, children }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

function InfoRow({ icon, text }) {
    return (
        <View style={styles.infoRow}>
            <MaterialIcons name={icon} size={18} color="#7E57C2" />
            <Text style={styles.infoText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { padding: 16, paddingBottom: 40 },
    hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    logo: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    name: { fontSize: 22, fontWeight: '800', color: '#222' },
    meta: { fontSize: 13, color: '#666', marginTop: 3 },
    section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 12 },
    bodyText: { fontSize: 14, lineHeight: 20, color: '#555', marginBottom: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    infoText: { flex: 1, color: '#555', fontSize: 14 },
    testRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    testRowActive: { backgroundColor: '#FAF5FF', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 },
    testName: { fontSize: 15, fontWeight: '800', color: '#333' },
    testTime: { fontSize: 12, color: '#777', marginTop: 2 },
    price: { fontSize: 15, fontWeight: '800', color: '#7E57C2' },
    input: { backgroundColor: '#F1F3F5', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    totalLabel: { fontSize: 16, color: '#555', fontWeight: '700' },
    totalValue: { fontSize: 18, color: '#7E57C2', fontWeight: '800' },
    confirmBtn: { backgroundColor: '#7E57C2', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
    confirmText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
