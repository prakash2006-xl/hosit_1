import { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

export default function HealthForm() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // State for form fields
    const [gender, setGender] = useState('Male');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [bp, setBp] = useState('Normal');
    const [sugar, setSugar] = useState('Normal');
    const [activity, setActivity] = useState('Moderate');
    const [smoking, setSmoking] = useState('No');
    const [alcohol, setAlcohol] = useState('No');
    const [sleep, setSleep] = useState('');

    const handleSubmit = () => {
        if (!height || !weight || !sleep) {
            Alert.alert('Missing Info', 'Please fill in all numeric fields (Height, Weight, Sleep).');
            return;
        }

        const data = {
            ...params, // name, age from previous screen
            gender,
            height,
            weight,
            bp,
            sugar,
            activity,
            smoking,
            alcohol,
            sleep
        };

        router.push({
            pathname: '/result',
            params: data
        });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Health Profile</Text>

            <View style={styles.card}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={gender}
                        onValueChange={(itemValue) => setGender(itemValue)}
                    >
                        <Picker.Item label="Male" value="Male" />
                        <Picker.Item label="Female" value="Female" />
                        <Picker.Item label="Other" value="Other" />
                    </Picker>
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Height (cm)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 175"
                            keyboardType="numeric"
                            value={height}
                            onChangeText={setHeight}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Weight (kg)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 70"
                            keyboardType="numeric"
                            value={weight}
                            onChangeText={setWeight}
                        />
                    </View>
                </View>

                <Text style={styles.label}>Blood Pressure</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={bp}
                        onValueChange={(itemValue) => setBp(itemValue)}
                    >
                        <Picker.Item label="Normal" value="Normal" />
                        <Picker.Item label="High" value="High" />
                    </Picker>
                </View>

                <Text style={styles.label}>Blood Sugar Level</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={sugar}
                        onValueChange={(itemValue) => setSugar(itemValue)}
                    >
                        <Picker.Item label="Normal" value="Normal" />
                        <Picker.Item label="High" value="High" />
                    </Picker>
                </View>

                <Text style={styles.label}>Physical Activity Level</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={activity}
                        onValueChange={(itemValue) => setActivity(itemValue)}
                    >
                        <Picker.Item label="Low (Sedentary)" value="Low" />
                        <Picker.Item label="Moderate (Active)" value="Moderate" />
                        <Picker.Item label="High (Athletic)" value="High" />
                    </Picker>
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Smoking?</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={smoking}
                                onValueChange={(itemValue) => setSmoking(itemValue)}
                            >
                                <Picker.Item label="No" value="No" />
                                <Picker.Item label="Yes" value="Yes" />
                            </Picker>
                        </View>
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Alcohol?</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={alcohol}
                                onValueChange={(itemValue) => setAlcohol(itemValue)}
                            >
                                <Picker.Item label="No" value="No" />
                                <Picker.Item label="Yes" value="Yes" />
                            </Picker>
                        </View>
                    </View>
                </View>

                <Text style={styles.label}>Daily Sleep (Hours)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 7"
                    keyboardType="numeric"
                    value={sleep}
                    onChangeText={setSleep}
                />

                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                    <Text style={styles.buttonText}>Generate Report</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#F5F5F5',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 20,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 40,
    },
    label: {
        fontSize: 16,
        marginBottom: 6,
        color: '#333',
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 16,
        overflow: 'hidden', // Required for rounded corners on Android picker sometimes
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    button: {
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
