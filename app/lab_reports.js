import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

export default function LabReportsScreen() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const raw = await AsyncStorage.getItem('lab_reports');
            setReports(raw ? JSON.parse(raw) : []);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#7E57C2" /></View>;

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={styles.list}
            data={reports}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={
                <View style={styles.header}>
                    <MaterialIcons name="analytics" size={34} color="#7E57C2" />
                    <Text style={styles.title}>Lab Report Analyzer</Text>
                    <Text style={styles.subtitle}>AI highlights abnormal values and trends. It does not diagnose disease.</Text>
                </View>
            }
            ListEmptyComponent={
                <View style={styles.empty}>
                    <MaterialIcons name="description" size={56} color="#CCC" />
                    <Text style={styles.emptyText}>No uploaded reports yet.</Text>
                </View>
            }
            renderItem={({ item }) => (
                <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                        <View>
                            <Text style={styles.reportName}>{item.name}</Text>
                            <Text style={styles.reportMeta}>{item.labName} | {new Date(item.createdAt).toLocaleString()}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                    </View>

                    {item.values?.map((value, index) => (
                        <View key={`${value.marker}-${index}`} style={styles.valueRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.marker}>{value.marker}</Text>
                                <Text style={styles.range}>Normal: {value.normalRange}</Text>
                                <Text style={styles.range}>Current: {value.currentValue}</Text>
                                <Text style={styles.recommendation}>{value.recommendation}</Text>
                            </View>
                            <View style={[styles.valueBadge, value.status === 'Low' ? styles.warningBadge : styles.borderlineBadge]}>
                                <Text style={styles.valueBadgeText}>{value.status}</Text>
                                <Text style={styles.trendText}>{value.trend}</Text>
                            </View>
                        </View>
                    ))}

                    <Text style={styles.disclaimer}>{item.disclaimer}</Text>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    list: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    title: { fontSize: 24, color: '#222', fontWeight: '800', marginTop: 8 },
    subtitle: { color: '#666', fontSize: 13, marginTop: 4, lineHeight: 19 },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: '#999', marginTop: 10, fontSize: 15 },
    reportCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    reportHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
    reportName: { fontSize: 17, fontWeight: '800', color: '#222' },
    reportMeta: { fontSize: 12, color: '#777', marginTop: 2 },
    statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
    statusText: { color: '#2E7D32', fontSize: 10, fontWeight: '800' },
    valueRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    marker: { fontSize: 15, fontWeight: '800', color: '#333' },
    range: { fontSize: 12, color: '#666', marginTop: 2 },
    recommendation: { fontSize: 12, color: '#555', lineHeight: 18, marginTop: 6 },
    valueBadge: { width: 112, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' },
    warningBadge: { backgroundColor: '#FFF3E0' },
    borderlineBadge: { backgroundColor: '#FFFDE7' },
    valueBadgeText: { fontSize: 13, color: '#E65100', fontWeight: '900' },
    trendText: { fontSize: 11, color: '#777', textAlign: 'center', marginTop: 4 },
    disclaimer: { fontSize: 12, color: '#777', lineHeight: 18, backgroundColor: '#F8F9FA', padding: 10, borderRadius: 10, marginTop: 8 },
});
