import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { API_URL } from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoctorConsultationScreen() {
    const { patient_id, doctor_id, patient_name } = useLocalSearchParams();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [patientContext, setPatientContext] = useState('');
    
    // Consultation Data
    const [symptoms, setSymptoms] = useState('');
    const [clinicalFindings, setClinicalFindings] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    
    // Prescription Data
    const [medicines, setMedicines] = useState([]);
    const [lifestyleAdvice, setLifestyleAdvice] = useState('');
    const [dietAdvice, setDietAdvice] = useState('');
    const [recommendedTests, setRecommendedTests] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');

    const [aiLoading, setAiLoading] = useState(false);
    const [drugCheckLoading, setDrugCheckLoading] = useState(false);
    const [drugWarnings, setDrugWarnings] = useState([]);
    const [showDrugCheckModal, setShowDrugCheckModal] = useState(false);

    // Load basic patient context for AI on mount
    useEffect(() => {
        const loadContext = async () => {
            try {
                const res = await fetch(`${API_URL}/doctor/patient/${patient_id}/profile`);
                if (res.ok) {
                    const data = await res.json();
                    setPatientContext(
                        `Age: ${data.age}, Gender: ${data.gender}, BMI: ${data.bmi}, BP: ${data.bp_status}, Sugar: ${data.sugar_status}. Allergies: ${data.allergies || 'None'}. Existing conditions: ${data.existing_diseases || 'None'}. Current meds: ${data.current_medications || 'None'}.`
                    );
                }
            } catch (e) {
                console.error("Failed to load context for AI", e);
            }
        };
        loadContext();
    }, [patient_id]);

    const handleAiSuggest = async () => {
        if (!symptoms || !diagnosis) {
            Alert.alert("Missing Info", "Please enter at least Symptoms and Diagnosis for AI to suggest a prescription.");
            return;
        }

        setAiLoading(true);
        try {
            const payload = {
                symptoms,
                diagnosis,
                patient_context: patientContext
            };

            const response = await fetch(`${API_URL}/doctor/prescription/ai_suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.medicines && Array.isArray(data.medicines)) {
                    setMedicines(data.medicines);
                }
                if (data.lifestyle_advice) setLifestyleAdvice(data.lifestyle_advice);
                if (data.diet_advice) setDietAdvice(data.diet_advice);
                if (data.recommended_tests && Array.isArray(data.recommended_tests)) {
                    setRecommendedTests(data.recommended_tests.join(', '));
                }
                
                Alert.alert("AI Success", "Prescription suggested. Please review and modify as needed.");
            } else {
                Alert.alert("AI Error", "Failed to get AI suggestions.");
            }
        } catch (error) {
            Alert.alert("Network Error", error.message);
        } finally {
            setAiLoading(false);
        }
    };

    const handleDrugCheck = async () => {
        if (medicines.length === 0) {
            Alert.alert("No Medicines", "Please add medicines to check.");
            return;
        }

        setDrugCheckLoading(true);
        try {
            // Re-fetch patient allergies to be sure
            const res = await fetch(`${API_URL}/patient/${patient_id}/medical-history`);
            let allergies = '';
            let current_meds = '';
            if (res.ok) {
                const hist = await res.json();
                allergies = hist.allergies;
                current_meds = hist.current_medications;
            }

            const payload = {
                medicines,
                allergies,
                current_medications: current_meds
            };

            const response = await fetch(`${API_URL}/doctor/prescription/drug_check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.warnings && data.warnings.length > 0) {
                    setDrugWarnings(data.warnings);
                    setShowDrugCheckModal(true);
                } else {
                    Alert.alert("Safety Check Passed", "No major interactions or allergy warnings found.");
                }
            } else {
                Alert.alert("Error", "Could not perform drug check.");
            }
        } catch (error) {
            Alert.alert("Network Error", error.message);
        } finally {
            setDrugCheckLoading(false);
        }
    };

    const addMedicine = () => {
        setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    };

    const updateMedicine = (index, field, value) => {
        const newMeds = [...medicines];
        newMeds[index][field] = value;
        setMedicines(newMeds);
    };

    const removeMedicine = (index) => {
        const newMeds = [...medicines];
        newMeds.splice(index, 1);
        setMedicines(newMeds);
    };

    const handleIssuePrescription = async () => {
        if (!diagnosis) {
            Alert.alert("Validation", "Diagnosis is required.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                doctor_id: parseInt(doctor_id),
                patient_id: parseInt(patient_id),
                symptoms,
                clinical_findings: clinicalFindings,
                diagnosis,
                vitals: {}, // Expandable later
                medicines,
                lifestyle_advice: lifestyleAdvice,
                diet_advice: dietAdvice,
                recommended_tests: recommendedTests ? recommendedTests.split(',').map(s => s.trim()).filter(s => s) : [],
                follow_up_date: followUpDate
            };

            const response = await fetch(`${API_URL}/doctor/prescription/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Alert.alert(
                    "Success",
                    "Prescription issued successfully and saved to patient's record.",
                    [{ text: "OK", onPress: () => router.back() }]
                );
            } else {
                Alert.alert("Error", "Failed to issue prescription.");
            }
        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Consultation</Text>
                    <Text style={styles.headerSub}>{patient_name}</Text>
                </View>
                <View style={{width: 24}} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Clinical Assessment</Text>
                    
                    <Text style={styles.label}>Symptoms</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="E.g., Fever, Cough, Headache for 3 days"
                        multiline
                        numberOfLines={3}
                        value={symptoms}
                        onChangeText={setSymptoms}
                    />

                    <Text style={styles.label}>Clinical Findings</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="E.g., Throat is red, Temperature 101F"
                        multiline
                        numberOfLines={3}
                        value={clinicalFindings}
                        onChangeText={setClinicalFindings}
                    />

                    <Text style={styles.label}>Diagnosis *</Text>
                    <TextInput
                        style={[styles.input, { borderColor: '#2196F3', borderWidth: 2 }]}
                        placeholder="E.g., Viral Pharyngitis"
                        value={diagnosis}
                        onChangeText={setDiagnosis}
                    />
                </View>

                <View style={styles.aiBox}>
                    <View style={styles.aiBoxHeader}>
                        <FontAwesome5 name="robot" size={20} color="#2196F3" />
                        <Text style={styles.aiBoxTitle}>AI Prescription Assistant</Text>
                    </View>
                    <Text style={styles.aiBoxText}>Let AI analyze the symptoms and patient history to suggest a tailored prescription.</Text>
                    <TouchableOpacity style={styles.aiBtn} onPress={handleAiSuggest} disabled={aiLoading}>
                        {aiLoading ? <ActivityIndicator color="#FFF" /> : (
                            <>
                                <FontAwesome5 name="magic" size={16} color="#FFF" />
                                <Text style={styles.aiBtnText}>Generate Suggestion</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={styles.sectionTitle}>2. Medicines</Text>
                        <TouchableOpacity style={styles.addMedBtn} onPress={addMedicine}>
                            <MaterialIcons name="add" size={20} color="#2196F3" />
                            <Text style={{color: '#2196F3', fontWeight: 'bold'}}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {medicines.map((med, index) => (
                        <View key={index} style={styles.medCard}>
                            <View style={styles.medHeader}>
                                <Text style={styles.medNumber}>Medicine {index + 1}</Text>
                                <TouchableOpacity onPress={() => removeMedicine(index)}>
                                    <MaterialIcons name="delete" size={20} color="#F44336" />
                                </TouchableOpacity>
                            </View>
                            <TextInput style={styles.input} placeholder="Medicine Name" value={med.name} onChangeText={(v) => updateMedicine(index, 'name', v)} />
                            <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                                <TextInput style={[styles.input, {flex: 1}]} placeholder="Dosage (e.g. 500mg)" value={med.dosage} onChangeText={(v) => updateMedicine(index, 'dosage', v)} />
                                <TextInput style={[styles.input, {flex: 1}]} placeholder="Freq (e.g. 1-0-1)" value={med.frequency} onChangeText={(v) => updateMedicine(index, 'frequency', v)} />
                            </View>
                            <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                                <TextInput style={[styles.input, {flex: 1}]} placeholder="Duration (e.g. 5 days)" value={med.duration} onChangeText={(v) => updateMedicine(index, 'duration', v)} />
                            </View>
                            <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Instructions (e.g. After meals)" value={med.instructions} onChangeText={(v) => updateMedicine(index, 'instructions', v)} />
                        </View>
                    ))}

                    <TouchableOpacity style={styles.drugCheckBtn} onPress={handleDrugCheck} disabled={drugCheckLoading || medicines.length === 0}>
                        {drugCheckLoading ? <ActivityIndicator color="#4CAF50" /> : (
                            <>
                                <MaterialIcons name="security" size={20} color="#4CAF50" />
                                <Text style={styles.drugCheckText}>Run Drug Safety Check</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Advice & Tests</Text>
                    
                    <Text style={styles.label}>Recommended Tests</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Comma separated (e.g. CBC, Lipid Profile)"
                        value={recommendedTests}
                        onChangeText={setRecommendedTests}
                    />

                    <Text style={styles.label}>Diet Advice</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Dietary instructions"
                        multiline
                        numberOfLines={2}
                        value={dietAdvice}
                        onChangeText={setDietAdvice}
                    />

                    <Text style={styles.label}>Lifestyle Advice</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Lifestyle instructions"
                        multiline
                        numberOfLines={2}
                        value={lifestyleAdvice}
                        onChangeText={setLifestyleAdvice}
                    />

                    <Text style={styles.label}>Follow Up Date</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 2026-07-20 or 'After 1 week'"
                        value={followUpDate}
                        onChangeText={setFollowUpDate}
                    />
                </View>

                <TouchableOpacity style={styles.issueBtn} onPress={handleIssuePrescription} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : (
                        <>
                            <MaterialIcons name="send" size={20} color="#FFF" />
                            <Text style={styles.issueBtnText}>Issue Prescription</Text>
                        </>
                    )}
                </TouchableOpacity>

            </ScrollView>

            <Modal visible={showDrugCheckModal} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.warningModal}>
                        <View style={styles.warningHeader}>
                            <MaterialIcons name="warning" size={30} color="#F44336" />
                            <Text style={styles.warningTitle}>Safety Alerts Found</Text>
                        </View>
                        <ScrollView style={{maxHeight: 200, marginVertical: 15}}>
                            {drugWarnings.map((w, i) => (
                                <View key={i} style={styles.warningItem}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.warningText}>{w}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.acknowledgeBtn} onPress={() => setShowDrugCheckModal(false)}>
                            <Text style={styles.acknowledgeText}>I Understand, Proceed</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    headerSub: { fontSize: 12, color: '#777', textAlign: 'center', marginTop: 2 },
    backBtn: { padding: 5 },
    scrollContent: { padding: 20, paddingBottom: 50 },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 15, textTransform: 'uppercase' },
    label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 8 },
    input: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#DDD' },
    textArea: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#DDD', minHeight: 80, textAlignVertical: 'top' },
    aiBox: { backgroundColor: '#E3F2FD', padding: 20, borderRadius: 12, marginBottom: 30, borderWidth: 1, borderColor: '#BBDEFB' },
    aiBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    aiBoxTitle: { fontSize: 16, fontWeight: 'bold', color: '#1565C0' },
    aiBoxText: { fontSize: 14, color: '#1565C0', marginBottom: 15, lineHeight: 20 },
    aiBtn: { backgroundColor: '#2196F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 10 },
    aiBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
    addMedBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    medCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
    medHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    medNumber: { fontWeight: 'bold', color: '#555' },
    drugCheckBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#C8E6C9', gap: 10 },
    drugCheckText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 15 },
    issueBtn: { backgroundColor: '#9C27B0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 12, gap: 10, marginTop: 10 },
    issueBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    warningModal: { backgroundColor: '#FFF', borderRadius: 16, padding: 25, width: '100%', maxWidth: 400 },
    warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 15 },
    warningTitle: { fontSize: 20, fontWeight: 'bold', color: '#D32F2F' },
    warningItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D32F2F', marginTop: 8 },
    warningText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22 },
    acknowledgeBtn: { backgroundColor: '#F44336', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    acknowledgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
