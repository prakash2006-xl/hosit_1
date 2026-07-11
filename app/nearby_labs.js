import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SAMPLE_LABS } from '../constants/healthModulesData';

export default function NearbyLabsScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [distance, setDistance] = useState(10);
    const [minRating, setMinRating] = useState(0);
    const [openNow, setOpenNow] = useState(false);
    const [homeCollection, setHomeCollection] = useState(false);

    const labs = useMemo(() => {
        const term = search.trim().toLowerCase();
        return SAMPLE_LABS.filter((lab) => {
            const matchesTest = !term || lab.tests.some((test) => test.name.toLowerCase().includes(term)) || lab.name.toLowerCase().includes(term);
            return matchesTest
                && lab.distance <= distance
                && lab.rating >= minRating
                && (!openNow || lab.openNow)
                && (!homeCollection || lab.homeCollection);
        }).sort((a, b) => a.distance - b.distance);
    }, [distance, homeCollection, minRating, openNow, search]);

    const renderLab = ({ item }) => (
        <TouchableOpacity
            style={styles.labCard}
            onPress={() => router.push({ pathname: '/lab_profile', params: { labId: String(item.id) } })}
        >
            <View style={styles.logoCircle}>
                <FontAwesome5 name="flask" size={24} color="#7E57C2" />
            </View>
            <View style={styles.labBody}>
                <View style={styles.cardTop}>
                    <Text style={styles.labName}>{item.name}</Text>
                    <Text style={styles.rating}>Rating {item.rating}</Text>
                </View>
                <Text style={styles.address}>{item.address}</Text>
                <Text style={styles.meta}>{item.distance} km | {item.openingHours}</Text>
                <Text style={styles.meta}>{item.contactNumber}</Text>
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, item.homeCollection ? styles.greenBadge : styles.grayBadge]}>
                        <Text style={styles.badgeText}>Home Collection: {item.homeCollection ? 'Yes' : 'No'}</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.tests.length} Tests</Text>
                    </View>
                </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#7E57C2" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="science" size={36} color="#7E57C2" />
                <Text style={styles.title}>Find Nearby Laboratories</Text>
                <Text style={styles.subtitle}>Compare labs, tests, prices, and report times.</Text>
            </View>

            <View style={styles.filterPanel}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by test name"
                    value={search}
                    onChangeText={setSearch}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {[3, 5, 10].map((value) => (
                        <FilterChip key={value} active={distance === value} label={`Within ${value} km`} onPress={() => setDistance(value)} />
                    ))}
                    {[4, 4.5].map((value) => (
                        <FilterChip key={value} active={minRating === value} label={`${value}+ Rating`} onPress={() => setMinRating(minRating === value ? 0 : value)} />
                    ))}
                    <FilterChip active={openNow} label="Open Now" onPress={() => setOpenNow(!openNow)} />
                    <FilterChip active={homeCollection} label="Home Collection" onPress={() => setHomeCollection(!homeCollection)} />
                </ScrollView>
            </View>

            <FlatList
                data={labs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderLab}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialIcons name="search-off" size={48} color="#CCC" />
                        <Text style={styles.emptyText}>No laboratories match these filters.</Text>
                    </View>
                }
            />
        </View>
    );
}

function FilterChip({ active, label, onPress }) {
    return (
        <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { backgroundColor: '#FFF', padding: 24, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    title: { fontSize: 24, fontWeight: '800', color: '#333', marginTop: 8 },
    subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
    filterPanel: { backgroundColor: '#FFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    searchInput: { backgroundColor: '#F1F3F5', borderRadius: 12, padding: 14, fontSize: 16 },
    chips: { gap: 8, paddingTop: 12 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
    chipActive: { backgroundColor: '#7E57C2', borderColor: '#7E57C2' },
    chipText: { color: '#555', fontWeight: '700', fontSize: 12 },
    chipTextActive: { color: '#FFF' },
    list: { padding: 16, paddingBottom: 40 },
    labCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
    logoCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center' },
    labBody: { flex: 1, marginLeft: 14 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    labName: { flex: 1, fontSize: 16, fontWeight: '800', color: '#222' },
    rating: { fontSize: 13, fontWeight: '800', color: '#FF9800', marginLeft: 8 },
    address: { color: '#555', fontSize: 13, marginTop: 2 },
    meta: { color: '#777', fontSize: 12, marginTop: 2 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    badge: { backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    greenBadge: { backgroundColor: '#E8F5E9' },
    grayBadge: { backgroundColor: '#EEE' },
    badgeText: { color: '#555', fontSize: 11, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { color: '#999', marginTop: 10, fontSize: 15 },
});
