import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RiskCard({ title, riskLevel, score }) {
    const getRiskColor = (level) => {
        switch (level) {
            case 'Low': return '#4CAF50'; // Green
            case 'Medium': return '#FFC107'; // Amber
            case 'High': return '#F44336'; // Red
            default: return '#757575'; // Grey
        }
    };

    const color = getRiskColor(riskLevel);

    return (
        <View style={[styles.card, { borderLeftColor: color }]}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <View style={[styles.badge, { backgroundColor: color }]}>
                    <Text style={styles.badgeText}>{riskLevel}</Text>
                </View>
            </View>
            {score !== undefined && <Text style={styles.score}>Score: {score}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderLeftWidth: 6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    score: {
        marginTop: 4,
        color: '#666',
    },
});
