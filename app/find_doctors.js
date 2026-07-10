import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { API_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SPECIALIZATIONS = [
    "All", "Cardiologist", "General Physician", "Pediatrician", 
    "Neurologist", "Dermatologist", "Orthopedic Surgeon", 
    "Psychiatrist", "Endocrinologist (Diabetologist)"
];

export default function FindDoctorsScreen() {
    const router = useRouter();
    const [doctors, setDoctors] = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSpecialization, setActiveSpecialization] = useState("All");

    useEffect(() => {
        fetchAllDoctors();
    }, []);

    const fetchAllDoctors = async () => {
        try {
            // For now, we can use the nearby doctors endpoint without lat/lng to get all doctors, 
            // or if the backend supports it, just fetch all. The /doctors/nearby endpoint falls back to all if no lat/lng.
            const response = await fetch(`${API_URL}/doctors/nearby?lat=0&lon=0`);
            const data = await response.json();
            if (response.ok) {
                setDoctors(data);
                setFilteredDoctors(data);
            }
        } catch (e) {
            console.error('Fetch error:', e);
            Alert.alert('Error', 'Failed to fetch doctors.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        filterDoctors();
    }, [searchQuery, activeSpecialization, doctors]);

    const filterDoctors = () => {
        let result = doctors;
        
        // Filter by specialization
        if (activeSpecialization !== "All") {
            result = result.filter(doc => doc.specialization === activeSpecialization);
        }

        // Filter by search query (Name, Hospital, or Location)
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            result = result.filter(doc => 
                (doc.name && doc.name.toLowerCase().includes(query)) ||
                (doc.hospital_name && doc.hospital_name.toLowerCase().includes(query)) ||
                (doc.specialization && doc.specialization.toLowerCase().includes(query))
            );
        }

        setFilteredDoctors(result);
    };

    const handleBook = (doctor) => {
        router.push({
            pathname: '/book_appointment',
            params: { 
                doctorId: doctor.id, 
                doctorName: doctor.name,
                doctorSpecialization: doctor.specialization,
                hospitalName: doctor.hospital_name
            }
        });
    };

    const renderSpecializationPill = (spec) => {
        const isActive = activeSpecialization === spec;
        return (
            <TouchableOpacity 
                key={spec} 
                style={[styles.pill, isActive && styles.activePill]}
                onPress={() => setActiveSpecialization(spec)}
            >
                <Text style={[styles.pillText, isActive && styles.activePillText]}>{spec}</Text>
            </TouchableOpacity>
        );
    };

    const renderDoctorCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.docInfo}>
                    <Text style={styles.docName}>Dr. {item.name}</Text>
                    <Text style={styles.docSpec}>{item.specialization}</Text>
                    <View style={styles.hospitalRow}>
                        <MaterialIcons name="local-hospital" size={14} color="#666" />
                        <Text style={styles.hospitalText}>{item.hospital_name || 'Hosit Partner Clinic'}</Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.actionRow}>
                <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: item.is_available ? '#4CAF50' : '#FF9800' }]} />
                    <Text style={styles.statusText}>{item.is_available ? 'Available Today' : 'Scheduled'}</Text>
                </View>
                <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(item)}>
                    <Text style={styles.bookBtnText}>Book Appointment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Find Doctors</Text>
                <View style={{width: 24}} />
            </View>

            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={24} color="#999" />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search doctors, hospitals..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <MaterialIcons name="close" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.categoriesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
                    {SPECIALIZATIONS.map(renderSpecializationPill)}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
            ) : (
                <FlatList
                    data={filteredDoctors}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderDoctorCard}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <FontAwesome5 name="user-md" size={60} color="#CCC" />
                            <Text style={styles.emptyText}>No doctors found matching your criteria.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backBtn: { padding: 5 },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 15, paddingHorizontal: 15, borderRadius: 12, elevation: 2, height: 50 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
    
    categoriesContainer: { height: 50, marginBottom: 10 },
    categoriesScroll: { paddingHorizontal: 15, alignItems: 'center' },
    pill: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#DDD' },
    activePill: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
    pillText: { color: '#666', fontWeight: '500' },
    activePillText: { color: '#FFF', fontWeight: 'bold' },
    
    list: { padding: 15, paddingBottom: 40 },
    card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: '#1976D2' },
    docInfo: { flex: 1 },
    docName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2 },
    docSpec: { fontSize: 14, color: '#2196F3', fontWeight: '500', marginBottom: 4 },
    hospitalRow: { flexDirection: 'row', alignItems: 'center' },
    hospitalText: { fontSize: 13, color: '#777', marginLeft: 4 },
    
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
    
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 12, fontWeight: '600', color: '#555' },
    
    bookBtn: { backgroundColor: '#1976D2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    bookBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#888', marginTop: 15, fontSize: 16 }
});
