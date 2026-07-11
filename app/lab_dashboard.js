import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LabDashboardScreen() {
    const router = useRouter();
    const [lab, setLab] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportName, setReportName] = useState('');

    useEffect(() => {
        loadPortal();
    }, []);

    const loadPortal = async () => {
        try {
            const labRaw = await AsyncStorage.getItem('lab_profile');
            if (!labRaw) {
                router.replace('/lab_auth');
                return;
            }
            const parsedLab = JSON.parse(labRaw);
            setLab(parsedLab);
            setTests(parsedLab.tests || []);

            const appointmentRaw = await AsyncStorage.getItem('lab_appointments');
            const allAppointments = appointmentRaw ? JSON.parse(appointmentRaw) : [];
            setAppointments(allAppointments.filter((item) => item.labId === parsedLab.id));
        } catch (e) {
            Alert.alert('Error', 'Could not load laboratory dashboard.');
        } finally {
            setLoading(false);
        }
    };

    const updateTest = async (testId, field, value) => {
        const updatedTests = tests.map((test) => (
            test.id === testId ? { ...test, [field]: field === 'price' ? Number(value) || 0 : value } : test
        ));
        setTests(updatedTests);
        const updatedLab = { ...lab, tests: updatedTests };
        setLab(updatedLab);
        await AsyncStorage.setItem('lab_profile', JSON.stringify(updatedLab));
    };

    const uploadReport = async () => {
        if (!reportName.trim()) {
            Alert.alert('Report Name Required', 'Enter a report name before upload.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: false,
            quality: 0.8
        });

        if (result.canceled) return;

        const report = {
            id: Date.now(),
            labId: lab.id,
            labName: lab.name,
            name: reportName.trim(),
            fileUri: result.assets?.[0]?.uri,
            status: 'AI Analysis Completed',
            createdAt: new Date().toISOString(),
            values: [
                { marker: 'Hemoglobin', normalRange: '13-17 g/dL', currentValue: '12.6 g/dL', status: 'Low', trend: 'Slight decrease', severity: 'Mild', recommendation: 'Discuss iron intake and follow up with a clinician if symptoms exist.' },
                { marker: 'Blood Sugar', normalRange: '70-100 mg/dL', currentValue: '108 mg/dL', status: 'Borderline', trend: 'Increase', severity: 'Moderate', recommendation: 'Review diet and repeat testing as advised by a doctor.' },
                { marker: 'Vitamin D', normalRange: '30-100 ng/mL', currentValue: '24 ng/mL', status: 'Low', trend: 'Stable', severity: 'Mild', recommendation: 'Ask your doctor about safe supplementation.' }
            ],
            disclaimer: 'AI analysis is informational only and does not diagnose disease. Consult a qualified medical professional.'
        };

        const reportsRaw = await AsyncStorage.getItem('lab_reports');
        const reports = reportsRaw ? JSON.parse(reportsRaw) : [];
        await AsyncStorage.setItem('lab_reports', JSON.stringify([report, ...reports]));

        const notificationsRaw = await AsyncStorage.getItem('patient_notifications');
        const notifications = notificationsRaw ? JSON.parse(notificationsRaw) : [];
        notifications.unshift(
            { id: Date.now(), title: 'Report Uploaded', message: `${lab.name} uploaded ${report.name}.`, type: 'lab', createdAt: new Date().toISOString() },
            { id: Date.now() + 1, title: 'AI Analysis Completed', message: 'Your lab report analysis is ready for review.', type: 'analysis', createdAt: new Date().toISOString() }
        );
        await AsyncStorage.setItem('patient_notifications', JSON.stringify(notifications));

        setReportName('');
        Alert.alert('Uploaded', 'Report stored locally and AI analysis notification created.');
    };

    const logout = async () => {
        await AsyncStorage.multiRemove(['lab_token', 'lab_profile']);
        router.replace('/auth');
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#7E57C2" /></View>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>Laboratory Portal</Text>
                    <Text style={styles.title}>{lab?.name}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <MaterialIcons name="logout" size={22} color="#F44336" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
                <StatCard label="Today's Appointments" value={appointments.length} color="#2196F3" />
                <StatCard label="Pending Tests" value={Math.max(appointments.length - 1, 0)} color="#FF9800" />
                <StatCard label="Completed Reports" value="3" color="#4CAF50" />
                <StatCard label="Pending Uploads" value={appointments.length ? 1 : 0} color="#7E57C2" />
            </View>

            <Section title="Today's Appointments">
                {appointments.length === 0 ? (
                    <Text style={styles.emptyText}>No appointments booked locally yet.</Text>
                ) : appointments.map((item) => (
                    <View key={item.id} style={styles.appointmentRow}>
                        <MaterialIcons name="event" size={20} color="#7E57C2" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowTitle}>{item.date} at {item.time}</Text>
                            <Text style={styles.rowSub}>{item.tests.map((test) => test.name).join(', ')}</Text>
                        </View>
                        <Text style={styles.amount}>Rs. {item.total}</Text>
                    </View>
                ))}
            </Section>

            <Section title="Upload Report">
                <TextInput
                    style={styles.input}
                    placeholder="Report name"
                    value={reportName}
                    onChangeText={setReportName}
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={uploadReport}>
                    <MaterialIcons name="upload-file" size={20} color="#FFF" />
                    <Text style={styles.primaryText}>Upload PDF, Image, or Scan</Text>
                </TouchableOpacity>
            </Section>

            <Section title="Edit Available Tests">
                {tests.map((test) => (
                    <View key={test.id} style={styles.testEditor}>
                        <Text style={styles.testName}>{test.name}</Text>
                        <TextInput
                            style={styles.smallInput}
                            value={String(test.price)}
                            onChangeText={(value) => updateTest(test.id, 'price', value)}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.timeInput}
                            value={test.resultTime}
                            onChangeText={(value) => updateTest(test.id, 'resultTime', value)}
                        />
                    </View>
                ))}
            </Section>
        </ScrollView>
    );
}

function Section({ title, children }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

function StatCard({ label, value, color }) {
    return (
        <View style={styles.statCard}>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    eyebrow: { color: '#7E57C2', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    title: { fontSize: 25, fontWeight: '800', color: '#222', marginTop: 3 },
    logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
    statCard: { width: '47%', backgroundColor: '#FFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EEE' },
    statValue: { fontSize: 24, fontWeight: '900' },
    statLabel: { color: '#777', fontSize: 12, marginTop: 4, fontWeight: '700' },
    section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 12 },
    emptyText: { color: '#999', textAlign: 'center', paddingVertical: 18 },
    appointmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    rowTitle: { fontSize: 14, color: '#333', fontWeight: '800' },
    rowSub: { fontSize: 12, color: '#777', marginTop: 2 },
    amount: { color: '#7E57C2', fontWeight: '800' },
    input: { backgroundColor: '#F1F3F5', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7E57C2', padding: 15, borderRadius: 12 },
    primaryText: { color: '#FFF', fontWeight: '800' },
    testEditor: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    testName: { flex: 1, fontSize: 14, fontWeight: '800', color: '#333' },
    smallInput: { width: 78, backgroundColor: '#F1F3F5', borderRadius: 10, padding: 10, textAlign: 'center' },
    timeInput: { width: 105, backgroundColor: '#F1F3F5', borderRadius: 10, padding: 10 },
});
