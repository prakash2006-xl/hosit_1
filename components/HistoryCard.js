import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function HistoryCard({ item, onPress }) {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getRiskColor = (level) => {
        if (level === 'High') return '#F44336';
        if (level === 'Medium') return '#FF9800';
        return '#4CAF50';
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.header}>
                <Text style={styles.date}>{formatDate(item.log_date)}</Text>
                <View style={styles.metricsRow}>
                    <Text style={styles.metricText}>Weight: {item.weight}kg</Text>
                    <Text style={styles.metricDivider}>|</Text>
                    <Text style={styles.metricText}>BMI: {item.bmi}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#999" />
            </View>

            <View style={styles.grid}>
                <RiskItem label="Diabetes" value={item.diabetes_risk} icon="heartbeat" color="#E91E63" />
                <RiskItem label="Heart" value={item.heart_risk} icon="heart" color="#F44336" />
                <RiskItem label="Obesity" value={item.obesity_risk} icon="weight" color="#9C27B0" />
                <RiskItem label="Hyper." value={item.hypertension_risk} icon="stethoscope" color="#673AB7" />
            </View>
        </TouchableOpacity>
    );
}

function RiskItem({ label, value, icon, color }) {
    const getRiskColor = (level) => {
        if (level === 'High') return '#F44336';
        if (level === 'Medium') return '#FF9800';
        return '#4CAF50';
    };

    return (
        <View style={styles.item}>
            <FontAwesome5 name={icon} size={14} color={getRiskColor(value)} style={styles.icon} />
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, { color: getRiskColor(value) }]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 8,
    },
    date: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metricText: {
        fontSize: 12,
        color: '#2196F3',
        fontWeight: 'bold',
    },
    metricDivider: {
        marginHorizontal: 6,
        color: '#DDD',
        fontSize: 12,
    },
    grid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    item: {
        alignItems: 'center',
        flex: 1,
    },
    label: {
        fontSize: 10,
        color: '#888',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    icon: {
        marginBottom: 4,
    }
});
