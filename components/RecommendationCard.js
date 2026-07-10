import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RecommendationCard({ title, recommendations, icon }) {
    if (!recommendations || recommendations.length === 0) return null;

    return (
        <View style={styles.card}>
            <Text style={styles.title}>{icon} {title}</Text>
            <View style={styles.list}>
                {recommendations.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.itemText}>{item}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#E3F2FD', // Light Blue
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 8,
    },
    list: {
        marginTop: 4,
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 4,
        alignItems: 'flex-start',
    },
    bullet: {
        marginRight: 8,
        fontSize: 16,
        color: '#1565C0',
    },
    itemText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
});
