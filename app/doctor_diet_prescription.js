import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../constants/config';
import { MEAL_TYPES } from '../constants/healthModulesData';

export default function DoctorDietPrescriptionScreen() {
    const router = useRouter();
    const [doctor, setDoctor] = useState(null);
    const [patientEmail, setPatientEmail] = useState('');
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const [form, setForm] = useState({
        diet_name: 'Preventive Wellness Diet',
        duration_days: '30',
        goal: 'Heart Health',
        water_intake_goal: '2500 ml/day',
        exercise_recommendation: '30 minutes brisk walk, 5 days/week',
        sleep_recommendation: '7-8 hours nightly',
        restrictions: 'Reduce fried foods, excess salt, sugary drinks',
        allowed_foods: 'Whole grains, dal, vegetables, fruits, curd, nuts',
        avoid_foods: 'Sugary drinks, deep fried snacks, late heavy meals',
        special_instructions: 'Adjust for allergies, medicines, and latest lab reports.'
    });
    const [meals, setMeals] = useState({
        Breakfast: 'Oats with milk, nuts, and one fruit',
        'Morning Snack': 'Curd or sprouts with cucumber',
        Lunch: 'Chapati or brown rice, dal, vegetables, salad',
        'Evening Snack': 'Fruit or roasted chana',
        Dinner: 'Light khichdi, vegetables, or grilled paneer'
    });

    useEffect(() => {
        AsyncStorage.getItem('doctor_profile').then((raw) => {
            if (raw) setDoctor(JSON.parse(raw));
            else router.replace('/doctor_auth');
        });
    }, []);

    const searchPatient = async () => {
        if (!patientEmail.trim()) {
            Alert.alert('Email Required', 'Enter patient email.');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/doctor/search-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: patientEmail.trim().toLowerCase() })
            });
            const data = await response.json();
            if (response.ok) {
                setPatient(data.user);
            } else {
                setPatient(null);
                Alert.alert('Not Found', data.message || 'Patient not found.');
            }
        } catch (e) {
            Alert.alert('Error', 'Could not connect to server.');
        } finally {
            setLoading(false);
        }
    };

    const issuePlan = async () => {
        if (!patient || !doctor) {
            Alert.alert('Patient Required', 'Search and select a patient first.');
            return;
        }
        setIssuing(true);
        try {
            const response = await fetch(`${API_URL}/doctor/diet-prescription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: patient.id,
                    doctor_id: doctor.id,
                    ...form,
                    duration_days: Number(form.duration_days || 30),
                    meal_plan: meals,
                    nutrition_summary: { calories: 1900, protein: 75, carbs: 220, fat: 60, fiber: 30 }
                })
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('Issued', 'Diet plan issued and patient notification created.');
            } else {
                Alert.alert('Failed', data.message || 'Could not issue diet plan.');
            }
        } catch (e) {
            Alert.alert('Error', 'Could not connect to server.');
        } finally {
            setIssuing(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <MaterialIcons name="restaurant-menu" size={34} color="#009688" />
                <Text style={styles.title}>Diet Prescription</Text>
                <Text style={styles.subtitle}>Create complete doctor-issued diet plans.</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Find Patient</Text>
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="patient@example.com"
                        value={patientEmail}
                        onChangeText={setPatientEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TouchableOpacity style={styles.searchBtn} onPress={searchPatient} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="search" size={22} color="#FFF" />}
                    </TouchableOpacity>
                </View>
                {patient && (
                    <View style={styles.patientBox}>
                        <Text style={styles.patientName}>{patient.name}</Text>
                        <Text style={styles.patientMeta}>{patient.email} | BMI {patient.bmi || '--'}</Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Plan Details</Text>
                <Field label="Diet Name" value={form.diet_name} onChangeText={(diet_name) => setForm({ ...form, diet_name })} />
                <Field label="Duration Days" value={form.duration_days} onChangeText={(duration_days) => setForm({ ...form, duration_days })} keyboardType="numeric" />
                <Field label="Goal" value={form.goal} onChangeText={(goal) => setForm({ ...form, goal })} />
                <Field label="Water Intake Goal" value={form.water_intake_goal} onChangeText={(water_intake_goal) => setForm({ ...form, water_intake_goal })} />
                <Field label="Exercise Recommendation" value={form.exercise_recommendation} onChangeText={(exercise_recommendation) => setForm({ ...form, exercise_recommendation })} />
                <Field label="Sleep Recommendation" value={form.sleep_recommendation} onChangeText={(sleep_recommendation) => setForm({ ...form, sleep_recommendation })} />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Meal Plan</Text>
                {MEAL_TYPES.map((meal) => (
                    <Field
                        key={meal}
                        label={meal}
                        value={meals[meal]}
                        onChangeText={(value) => setMeals({ ...meals, [meal]: value })}
                        multiline
                    />
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Restrictions and Instructions</Text>
                <Field label="Restrictions" value={form.restrictions} onChangeText={(restrictions) => setForm({ ...form, restrictions })} multiline />
                <Field label="Allowed Foods" value={form.allowed_foods} onChangeText={(allowed_foods) => setForm({ ...form, allowed_foods })} multiline />
                <Field label="Avoid Foods" value={form.avoid_foods} onChangeText={(avoid_foods) => setForm({ ...form, avoid_foods })} multiline />
                <Field label="Special Instructions" value={form.special_instructions} onChangeText={(special_instructions) => setForm({ ...form, special_instructions })} multiline />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={issuePlan} disabled={issuing}>
                {issuing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Issue Diet Plan</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

function Field({ label, ...props }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={[styles.input, props.multiline && styles.multiline]} {...props} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { padding: 16, paddingBottom: 40 },
    header: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    title: { fontSize: 24, fontWeight: '800', color: '#222', marginTop: 8 },
    subtitle: { color: '#666', marginTop: 4 },
    section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 12 },
    searchRow: { flexDirection: 'row', backgroundColor: '#F1F3F5', borderRadius: 12, overflow: 'hidden' },
    searchInput: { flex: 1, padding: 14, fontSize: 15 },
    searchBtn: { width: 56, backgroundColor: '#009688', alignItems: 'center', justifyContent: 'center' },
    patientBox: { backgroundColor: '#E0F2F1', padding: 12, borderRadius: 12, marginTop: 12 },
    patientName: { color: '#00796B', fontSize: 16, fontWeight: '900' },
    patientMeta: { color: '#555', fontSize: 12, marginTop: 3 },
    field: { marginBottom: 12 },
    label: { fontSize: 12, color: '#666', fontWeight: '800', marginBottom: 6 },
    input: { backgroundColor: '#F1F3F5', borderRadius: 12, padding: 13, fontSize: 15 },
    multiline: { minHeight: 72, textAlignVertical: 'top' },
    primaryBtn: { backgroundColor: '#009688', borderRadius: 14, padding: 16, alignItems: 'center' },
    primaryText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
