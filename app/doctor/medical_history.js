import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { API_URL } from '../../constants/config';

export default function DoctorMedicalHistoryScreen() {
    const { patient_id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState(null);

    useEffect(() => {
        loadPatientData();
    }, [patient_id]);

    const loadPatientData = async () => {
        try {
            const res = await fetch(`${API_URL}/doctor/patient/${patient_id}/profile`);
            if (res.ok) {
                const data = await res.json();
                setPatient(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
    }

    if (!patient || !patient.id) {
        return (
            <View style={styles.center}>
                <Text>Patient not found or no data available.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text>Go Back</Text></TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtnIcon}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{patient.name}'s History</Text>
                <View style={{width: 24}} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Health Profile</Text>
                    <View style={styles.rowGrid}>
                        <InfoBadge label="Age" value={patient.age} />
                        <InfoBadge label="Gender" value={patient.gender} />
                        <InfoBadge label="Blood" value={patient.blood_group} color="#F44336" />
                        <InfoBadge label="BMI" value={patient.bmi} />
                        <InfoBadge label="Height" value={patient.height ? `${patient.height}cm` : ''} />
                        <InfoBadge label="Weight" value={patient.weight ? `${patient.weight}kg` : ''} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vital Status</Text>
                    <View style={styles.rowGrid}>
                        <InfoBadge label="BP" value={patient.bp_status} color={patient.bp_status === 'High' ? '#F44336' : '#4CAF50'} />
                        <InfoBadge label="Sugar" value={patient.sugar_status} color={patient.sugar_status === 'High' ? '#FF9800' : '#4CAF50'} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Medical History Details</Text>
                    
                    <DetailItem title="Allergies" content={patient.allergies} icon="allergies" color="#E91E63" />
                    <DetailItem title="Existing Diseases" content={patient.existing_diseases} icon="notes-medical" color="#FF9800" />
                    <DetailItem title="Current Medications" content={patient.current_medications} icon="pills" color="#2196F3" />
                    <DetailItem title="Past Surgeries" content={patient.past_surgeries} icon="procedures" color="#9C27B0" />
                    <DetailItem title="Family History" content={patient.family_history} icon="users" color="#607D8B" />
                    
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lifestyle Habits</Text>
                    <View style={styles.rowGrid}>
                        <InfoBadge label="Activity" value={patient.activity_level} />
                        <InfoBadge label="Smoking" value={patient.smoking} color={patient.smoking === 'Yes' ? '#F44336' : '#9E9E9E'} />
                        <InfoBadge label="Alcohol" value={patient.alcohol} color={patient.alcohol === 'Yes' ? '#F44336' : '#9E9E9E'} />
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

function InfoBadge({ label, value, color = '#2196F3' }) {
    if (!value) return null;
    return (
        <View style={[styles.badge, { borderColor: color }]}>
            <Text style={styles.badgeLabel}>{label}</Text>
            <Text style={[styles.badgeValue, { color }]}>{value}</Text>
        </View>
    );
}

function DetailItem({ title, content, icon, color }) {
    if (!content) return null;
    return (
        <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
                <FontAwesome5 name={icon} size={16} color={color} />
                <Text style={[styles.detailTitle, { color }]}>{title}</Text>
            </View>
            <Text style={styles.detailContent}>{content}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backBtnIcon: { padding: 5 },
    backBtn: { marginTop: 20, padding: 10, backgroundColor: '#EEE', borderRadius: 8 },
    scrollContent: { padding: 20, paddingBottom: 50 },
    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#666', marginBottom: 15, textTransform: 'uppercase' },
    rowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    badge: { borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: '#FFF', minWidth: '30%', alignItems: 'center' },
    badgeLabel: { fontSize: 12, color: '#777', marginBottom: 4 },
    badgeValue: { fontSize: 16, fontWeight: 'bold' },
    detailCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    detailTitle: { fontSize: 16, fontWeight: 'bold' },
    detailContent: { fontSize: 15, color: '#444', lineHeight: 22 }
});
