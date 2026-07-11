import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DEFAULT_DIET_PLAN, MEAL_TYPES } from '../constants/healthModulesData';

const today = () => new Date().toISOString().slice(0, 10);

export default function DietMonitoringScreen() {
    const [mealType, setMealType] = useState('Breakfast');
    const [form, setForm] = useState({ time: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', water: '', notes: '' });
    const [logs, setLogs] = useState([]);
    const [profile, setProfile] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const profileRaw = await AsyncStorage.getItem('user_profile');
        setProfile(profileRaw ? JSON.parse(profileRaw) : {});
        const raw = await AsyncStorage.getItem('meal_logs');
        setLogs(raw ? JSON.parse(raw) : []);
    };

    const todaysLogs = useMemo(() => logs.filter((item) => item.date === today()), [logs]);
    const totals = useMemo(() => todaysLogs.reduce((acc, item) => ({
        calories: acc.calories + Number(item.calories || 0),
        protein: acc.protein + Number(item.protein || 0),
        carbs: acc.carbs + Number(item.carbs || 0),
        fat: acc.fat + Number(item.fat || 0),
        fiber: acc.fiber + Number(item.fiber || 0),
        water: acc.water + Number(item.water || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 }), [todaysLogs]);

    const bmi = profile.height && profile.weight
        ? profile.weight / ((profile.height / 100) * (profile.height / 100))
        : profile.bmi;
    const goals = DEFAULT_DIET_PLAN.dailyGoals;
    const completedMeals = new Set(todaysLogs.map((item) => item.mealType)).size;
    const mealAdherence = Math.round((completedMeals / MEAL_TYPES.length) * 100);
    const nutritionScore = Math.max(0, Math.min(100, Math.round(
        100
        - Math.abs(goals.calories - totals.calories) / 35
        - Math.max(0, goals.protein - totals.protein)
        - Math.max(0, goals.fiber - totals.fiber) * 1.5
    )));

    const saveMeal = async () => {
        if (!form.calories) {
            Alert.alert('Missing Calories', 'Please enter calories for this meal.');
            return;
        }
        const entry = {
            id: Date.now(),
            date: today(),
            mealType,
            ...form,
            calories: Number(form.calories || 0),
            protein: Number(form.protein || 0),
            carbs: Number(form.carbs || 0),
            fat: Number(form.fat || 0),
            fiber: Number(form.fiber || 0),
            water: Number(form.water || 0)
        };
        const updated = [entry, ...logs];
        setLogs(updated);
        await AsyncStorage.setItem('meal_logs', JSON.stringify(updated));
        setForm({ time: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', water: '', notes: '' });

        const notificationsRaw = await AsyncStorage.getItem('patient_notifications');
        const notifications = notificationsRaw ? JSON.parse(notificationsRaw) : [];
        if (entry.calories > goals.calories * 0.45) {
            notifications.unshift({
                id: Date.now(),
                title: 'Calorie Warning',
                message: `${mealType} used a large share of your daily calorie goal. Balance the next meal.`,
                type: 'diet',
                createdAt: new Date().toISOString()
            });
            await AsyncStorage.setItem('patient_notifications', JSON.stringify(notifications));
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <MaterialIcons name="restaurant" size={34} color="#009688" />
                <Text style={styles.title}>Diet Monitoring</Text>
                <Text style={styles.subtitle}>Track meals, hydration, nutrition score, and adherence.</Text>
            </View>

            <View style={styles.grid}>
                <Metric label="Daily Calories" value={`${totals.calories}/${goals.calories}`} color="#2196F3" />
                <Metric label="Protein" value={`${totals.protein}g`} color="#4CAF50" />
                <Metric label="Carbohydrates" value={`${totals.carbs}g`} color="#FF9800" />
                <Metric label="Fat" value={`${totals.fat}g`} color="#E91E63" />
                <Metric label="Fiber" value={`${totals.fiber}g`} color="#795548" />
                <Metric label="Water Intake" value={`${totals.water}ml`} color="#00BCD4" />
                <Metric label="Nutrition Score" value={nutritionScore} color="#673AB7" />
                <Metric label="Meal Adherence" value={`${mealAdherence}%`} color="#009688" />
                <Metric label="Weight" value={profile.weight ? `${profile.weight}kg` : '--'} color="#607D8B" />
                <Metric label="BMI" value={bmi ? Number(bmi).toFixed(1) : '--'} color="#3F51B5" />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add Meal</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {MEAL_TYPES.map((type) => (
                        <TouchableOpacity key={type} style={[styles.chip, mealType === type && styles.chipActive]} onPress={() => setMealType(type)}>
                            <Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <TextInput style={styles.input} placeholder="Time (HH:MM)" value={form.time} onChangeText={(time) => setForm({ ...form, time })} />
                <View style={styles.inputRow}>
                    <TextInput style={styles.halfInput} placeholder="Calories" value={form.calories} onChangeText={(calories) => setForm({ ...form, calories })} keyboardType="numeric" />
                    <TextInput style={styles.halfInput} placeholder="Protein g" value={form.protein} onChangeText={(protein) => setForm({ ...form, protein })} keyboardType="numeric" />
                </View>
                <View style={styles.inputRow}>
                    <TextInput style={styles.halfInput} placeholder="Carbs g" value={form.carbs} onChangeText={(carbs) => setForm({ ...form, carbs })} keyboardType="numeric" />
                    <TextInput style={styles.halfInput} placeholder="Fat g" value={form.fat} onChangeText={(fat) => setForm({ ...form, fat })} keyboardType="numeric" />
                </View>
                <View style={styles.inputRow}>
                    <TextInput style={styles.halfInput} placeholder="Fiber g" value={form.fiber} onChangeText={(fiber) => setForm({ ...form, fiber })} keyboardType="numeric" />
                    <TextInput style={styles.halfInput} placeholder="Water ml" value={form.water} onChangeText={(water) => setForm({ ...form, water })} keyboardType="numeric" />
                </View>
                <TextInput style={styles.input} placeholder="Notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} />
                <TouchableOpacity style={styles.primaryBtn} onPress={saveMeal}>
                    <Text style={styles.primaryText}>Save Meal</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI Diet Analysis</Text>
                <AnalysisLine label="Calorie Balance" text={totals.calories > goals.calories ? 'Above daily goal. Keep dinner lighter.' : 'Within daily goal so far.'} />
                <AnalysisLine label="Protein" text={totals.protein < goals.protein ? 'Protein is below target. Add dal, paneer, eggs, curd, or legumes.' : 'Protein target is on track.'} />
                <AnalysisLine label="Fiber" text={totals.fiber < goals.fiber ? 'Fiber is low. Increase vegetables, fruit, oats, and pulses.' : 'Fiber intake looks good.'} />
                <AnalysisLine label="Hydration" text={totals.water < goals.water ? 'Drink water steadily through the day.' : 'Hydration goal reached.'} />
                <Text style={styles.disclaimer}>General nutrition guidance only. Medical conditions, allergies, medicines, and lab reports should be reviewed by a clinician or dietitian.</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
                {todaysLogs.length === 0 ? <Text style={styles.emptyText}>No meals logged today.</Text> : todaysLogs.map((item) => (
                    <View key={item.id} style={styles.mealRow}>
                        <View>
                            <Text style={styles.mealName}>{item.mealType}</Text>
                            <Text style={styles.mealSub}>{item.time || '--'} | {item.notes || 'No notes'}</Text>
                        </View>
                        <Text style={styles.mealCalories}>{item.calories} kcal</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

function Metric({ label, value, color }) {
    return (
        <View style={styles.metric}>
            <Text style={[styles.metricValue, { color }]}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

function AnalysisLine({ label, text }) {
    return (
        <View style={styles.analysisLine}>
            <Text style={styles.analysisLabel}>{label}</Text>
            <Text style={styles.analysisText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { padding: 16, paddingBottom: 40 },
    header: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    title: { fontSize: 24, fontWeight: '800', color: '#222', marginTop: 8 },
    subtitle: { color: '#666', fontSize: 13, marginTop: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    metric: { width: '48%', backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEE' },
    metricValue: { fontSize: 19, fontWeight: '900' },
    metricLabel: { fontSize: 12, color: '#777', marginTop: 4, fontWeight: '700' },
    section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 12 },
    chips: { gap: 8, paddingBottom: 12 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
    chipActive: { backgroundColor: '#009688', borderColor: '#009688' },
    chipText: { color: '#555', fontWeight: '800', fontSize: 12 },
    chipTextActive: { color: '#FFF' },
    input: { backgroundColor: '#F1F3F5', borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 10 },
    inputRow: { flexDirection: 'row', gap: 10 },
    halfInput: { flex: 1, backgroundColor: '#F1F3F5', borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 10 },
    primaryBtn: { backgroundColor: '#009688', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 4 },
    primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    analysisLine: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    analysisLabel: { fontWeight: '900', color: '#333', marginBottom: 3 },
    analysisText: { color: '#555', lineHeight: 19 },
    disclaimer: { color: '#777', fontSize: 12, lineHeight: 18, marginTop: 12, backgroundColor: '#F8F9FA', padding: 10, borderRadius: 10 },
    emptyText: { color: '#999', textAlign: 'center', paddingVertical: 16 },
    mealRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    mealName: { fontSize: 15, fontWeight: '800', color: '#333' },
    mealSub: { fontSize: 12, color: '#777', marginTop: 2 },
    mealCalories: { color: '#009688', fontWeight: '900' },
});
