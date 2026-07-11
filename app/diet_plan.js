import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DEFAULT_DIET_PLAN, MEAL_TYPES } from '../constants/healthModulesData';

const today = () => new Date().toISOString().slice(0, 10);

export default function DietPlanScreen() {
    const [plan, setPlan] = useState(DEFAULT_DIET_PLAN);
    const [completed, setCompleted] = useState({});

    useEffect(() => {
        loadPlan();
    }, []);

    const loadPlan = async () => {
        const rawPlan = await AsyncStorage.getItem('current_diet_plan');
        if (rawPlan) setPlan(JSON.parse(rawPlan));
        const rawCompleted = await AsyncStorage.getItem('diet_completed_meals');
        setCompleted(rawCompleted ? JSON.parse(rawCompleted) : {});
    };

    const toggleMeal = async (meal) => {
        const key = `${today()}-${meal}`;
        const updated = { ...completed, [key]: !completed[key] };
        setCompleted(updated);
        await AsyncStorage.setItem('diet_completed_meals', JSON.stringify(updated));

        if (!completed[key]) {
            const notificationsRaw = await AsyncStorage.getItem('patient_notifications');
            const notifications = notificationsRaw ? JSON.parse(notificationsRaw) : [];
            notifications.unshift({
                id: Date.now(),
                title: 'Meal Completed',
                message: `${meal} marked complete for your diet plan.`,
                type: 'diet',
                createdAt: new Date().toISOString()
            });
            await AsyncStorage.setItem('patient_notifications', JSON.stringify(notifications));
        }
    };

    const progress = Math.round((MEAL_TYPES.filter((meal) => completed[`${today()}-${meal}`]).length / MEAL_TYPES.length) * 100);

    const downloadPlan = () => {
        Alert.alert('Diet Plan Ready', 'Plan details are available on this screen for sharing or printing.');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <MaterialIcons name="assignment" size={34} color="#009688" />
                <Text style={styles.title}>{plan.dietName}</Text>
                <Text style={styles.subtitle}>Issued by {plan.doctorName}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Diet Plan</Text>
                <Info label="Goal" value={plan.goal} />
                <Info label="Issue Date" value={plan.issueDate} />
                <Info label="Expiry Date" value={plan.expiryDate} />
                <Info label="Water Intake Goal" value={`${plan.dailyGoals?.water || 2500} ml`} />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nutrition Summary</Text>
                <View style={styles.summaryGrid}>
                    <Summary label="Calories" value={plan.dailyGoals?.calories} />
                    <Summary label="Protein" value={`${plan.dailyGoals?.protein}g`} />
                    <Summary label="Carbs" value={`${plan.dailyGoals?.carbs}g`} />
                    <Summary label="Fat" value={`${plan.dailyGoals?.fat}g`} />
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.progressHeader}>
                    <Text style={styles.sectionTitle}>Meal Schedule</Text>
                    <Text style={styles.progress}>{progress}%</Text>
                </View>
                {MEAL_TYPES.map((meal) => {
                    const done = completed[`${today()}-${meal}`];
                    return (
                        <TouchableOpacity key={meal} style={styles.mealRow} onPress={() => toggleMeal(meal)}>
                            <MaterialIcons name={done ? 'check-circle' : 'radio-button-unchecked'} size={24} color={done ? '#009688' : '#AAA'} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.mealName}>{meal}</Text>
                                <Text style={styles.mealText}>{plan.meals?.[meal] || 'No foods added'}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Restrictions and Guidance</Text>
                <Info label="Allowed Foods" value={plan.allowedFoods} />
                <Info label="Avoid Foods" value={plan.avoidFoods} />
                <Info label="Special Instructions" value={plan.instructions || plan.specialInstructions} />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={downloadPlan}>
                <MaterialIcons name="download" size={20} color="#FFF" />
                <Text style={styles.primaryText}>Download Diet Plan</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

function Info({ label, value }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value || '--'}</Text>
        </View>
    );
}

function Summary({ label, value }) {
    return (
        <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{value || '--'}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { padding: 16, paddingBottom: 40 },
    header: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    title: { fontSize: 24, fontWeight: '800', color: '#222', marginTop: 8 },
    subtitle: { color: '#666', fontSize: 13, marginTop: 4 },
    section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 12 },
    infoRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    infoLabel: { color: '#777', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    infoValue: { color: '#333', fontSize: 14, marginTop: 3, lineHeight: 20 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    summaryItem: { width: '47%', backgroundColor: '#E0F2F1', borderRadius: 12, padding: 12 },
    summaryValue: { color: '#00796B', fontSize: 18, fontWeight: '900' },
    summaryLabel: { color: '#555', fontSize: 12, marginTop: 3, fontWeight: '700' },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progress: { color: '#009688', fontSize: 17, fontWeight: '900' },
    mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    mealName: { fontSize: 15, color: '#333', fontWeight: '900' },
    mealText: { fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 },
    primaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#009688', padding: 16, borderRadius: 14 },
    primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
