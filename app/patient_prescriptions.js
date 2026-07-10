import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { API_URL } from '../constants/config';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function PatientPrescriptionsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [prescriptions, setPrescriptions] = useState([]);

    useEffect(() => {
        loadPrescriptions();
    }, []);

    const loadPrescriptions = async () => {
        try {
            const savedProfile = await AsyncStorage.getItem('user_profile');
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                const userId = profile.id;
                
                const res = await fetch(`${API_URL}/patient/prescriptions/${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    setPrescriptions(data);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (presc) => {
        try {
            const dateStr = new Date(presc.created_at).toLocaleDateString();
            
            // Build Medicines HTML
            let medicinesHtml = '';
            if (presc.medicines && presc.medicines.length > 0) {
                medicinesHtml = `
                    <h3>Medicines:</h3>
                    <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ddd; padding: 8px;">Medicine</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Dosage</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Freq</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Duration</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Instructions</th>
                        </tr>
                        ${presc.medicines.map(m => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${m.medicine_name}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${m.dosage}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${m.frequency}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${m.duration}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${m.instructions || ''}</td>
                        </tr>`).join('')}
                    </table>
                `;
            }

            // Build Tests HTML
            let testsHtml = '';
            if (presc.tests && presc.tests.length > 0) {
                testsHtml = `
                    <h3>Recommended Tests:</h3>
                    <ul>
                        ${presc.tests.map(t => `<li>${t}</li>`).join('')}
                    </ul>
                `;
            }

            const htmlContent = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid #2196F3; padding-bottom: 20px; margin-bottom: 30px; }
                        .hospital-name { font-size: 28px; font-weight: bold; color: #2196F3; margin: 0; }
                        .doc-details { font-size: 14px; color: #666; margin-top: 5px; }
                        .presc-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .diagnosis { background: #f9f9f9; padding: 15px; border-left: 4px solid #2196F3; margin-bottom: 20px; }
                        .advice { margin-top: 20px; padding: 15px; background: #FFF9C4; border-radius: 8px; }
                        .footer { margin-top: 50px; text-align: right; border-top: 1px solid #eee; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 class="hospital-name">${presc.doctor_hospital || 'Hosit Partner Clinic'}</h1>
                        <p class="doc-details">Dr. ${presc.doctor_name}<br/>${presc.doctor_specialization || 'Consulting Physician'}</p>
                    </div>
                    
                    <div class="presc-meta">
                        <div>
                            <strong>Patient ID:</strong> HS-${presc.patient_id}<br/>
                            <strong>Date:</strong> ${dateStr}
                        </div>
                        <div>
                            <strong>Prescription ID:</strong> PRX-${presc.id}
                        </div>
                    </div>
                    
                    <div class="diagnosis">
                        <strong>Diagnosis:</strong> ${presc.diagnosis}
                    </div>
                    
                    ${medicinesHtml}
                    ${testsHtml}
                    
                    ${(presc.lifestyle_advice || presc.diet_advice) ? `
                    <div class="advice">
                        <h4>Doctor's Advice:</h4>
                        ${presc.lifestyle_advice ? `<p><strong>Lifestyle:</strong> ${presc.lifestyle_advice}</p>` : ''}
                        ${presc.diet_advice ? `<p><strong>Diet:</strong> ${presc.diet_advice}</p>` : ''}
                    </div>` : ''}
                    
                    ${presc.follow_up_date ? `<p style="margin-top:20px;"><strong>Next Follow Up:</strong> ${presc.follow_up_date}</p>` : ''}
                    
                    <div class="footer">
                        <p><strong>Dr. ${presc.doctor_name}</strong><br/>(Electronically Signed)</p>
                    </div>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert("Success", "PDF Generated. Please check your files.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    const renderItem = ({ item }) => {
        const dateStr = new Date(item.created_at).toLocaleDateString();
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateText}>{dateStr}</Text>
                    </View>
                    <Text style={styles.docName}>Dr. {item.doctor_name}</Text>
                </View>
                <Text style={styles.diagnosis} numberOfLines={1}>Dx: {item.diagnosis}</Text>
                
                <View style={styles.divider} />
                
                <View style={styles.actionRow}>
                    <Text style={styles.medCount}>{item.medicines?.length || 0} Medicines</Text>
                    
                    <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownloadPDF(item)}>
                        <MaterialIcons name="picture-as-pdf" size={20} color="#FFF" />
                        <Text style={styles.downloadText}>Download</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Prescriptions</Text>
                <View style={{width: 24}} />
            </View>
            
            {prescriptions.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialIcons name="receipt-long" size={60} color="#CCC" />
                    <Text style={styles.emptyText}>You don't have any prescriptions yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={prescriptions}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backBtn: { padding: 5 },
    list: { padding: 20 },
    card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    dateBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    dateText: { color: '#1565C0', fontSize: 12, fontWeight: 'bold' },
    docName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    diagnosis: { fontSize: 15, color: '#555', marginBottom: 15, fontStyle: 'italic' },
    divider: { height: 1, backgroundColor: '#EEE', marginBottom: 15 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    medCount: { fontSize: 14, color: '#777', fontWeight: '500' },
    downloadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F44336', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, gap: 5 },
    downloadText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { color: '#888', fontSize: 16, marginTop: 15, textAlign: 'center' }
});
