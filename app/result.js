import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import RiskCard from '../components/RiskCard';
import RecommendationCard from '../components/RecommendationCard';
import { API_URL } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';

export default function ResultScreen() {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useLocalSearchParams();
    const [risks, setRisks] = useState({});
    const [recommendations, setRecommendations] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hasHealthData = params.diabetes_risk || params.bmi || params.height;

        if (params.fromDashboard === 'true' || hasHealthData) {
            fetchPredictions();
        } else {
            setLoading(false);
        }
    }, [params]);

    const fetchPredictions = async () => {
        try {
            // If we came from dashboard, we might need to fetch predictions based on latest profile
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const result = await response.json();

            if (response.ok) {
                setRisks(result.risks || {});
                setRecommendations(result.recommendations || {});
            } else {
                console.error("Prediction error:", result.message);
            }
        } catch (error) {
            console.error("API Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>{t('results.analyzing')}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.header}>{t('results.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Health Inputs Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('results.your_inputs')}</Text>
                <View style={styles.inputsGrid}>
                    <InputItem label={t('dashboard.age')} value={params.age} />
                    <InputItem label={t('dashboard.gender')} value={params.gender} />
                    <InputItem label="BMI" value={params.bmi ? Number(params.bmi).toFixed(1) : '--'} />
                    <InputItem label={t('dashboard.bp_status')} value={params.bp_status} />
                    <InputItem label={t('dashboard.activity')} value={params.activity_level} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('results.risk_analysis')}</Text>
                <RiskCard title={t('results.risks.diabetes')} riskLevel={risks.diabetes} />
                <RiskCard title={t('results.risks.heart')} riskLevel={risks.heart} />
                <RiskCard title={t('results.risks.obesity')} riskLevel={risks.obesity} />
                <RiskCard title={t('results.risks.hypertension')} riskLevel={risks.hypertension} />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('results.personalized_recs')}</Text>
                {recommendations.diet && (
                    <RecommendationCard
                        title={t('results.diet_plan')}
                        recommendations={recommendations.diet}
                        icon="🍎"
                    />
                )}
                {recommendations.exercise && (
                    <RecommendationCard
                        title={t('results.exercise_plan')}
                        recommendations={recommendations.exercise}
                        icon="🏃"
                    />
                )}
                {recommendations.lifestyle && (
                    <RecommendationCard
                        title={t('results.lifestyle_sleep')}
                        recommendations={recommendations.lifestyle}
                        icon="💤"
                    />
                )}
            </View>

            <TouchableOpacity style={styles.button} onPress={() => router.replace('/dashboard')}>
                <Text style={styles.buttonText}>{t('results.start_over')}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

function InputItem({ label, value }) {
    if (!value) return null;
    return (
        <View style={styles.inputItem}>
            <Text style={styles.inputLabel}>{label}</Text>
            <Text style={styles.inputValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8F9FA',
        paddingBottom: 40,
    },
    headerContainer: {
        backgroundColor: '#2196F3',
        padding: 20,
        paddingTop: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        marginBottom: 20,
    },
    backBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        flex: 1,
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 12,
        marginLeft: 4,
    },
    button: {
        backgroundColor: '#1565C0',
        padding: 18,
        borderRadius: 50,
        alignItems: 'center',
        marginHorizontal: 30,
        marginTop: 10,
        elevation: 3,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 16,
        gap: 15,
        elevation: 2,
    },
    inputItem: {
        width: '45%',
    },
    inputLabel: {
        fontSize: 11,
        color: '#888',
        textTransform: 'uppercase',
    },
    inputValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 2,
    },
});
