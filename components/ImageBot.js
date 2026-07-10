import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Alert,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Using the central config for keys
import { API_URL } from "../constants/config";

export default function ImageBot() {
    const router = useRouter();
    const [imageUri, setImageUri] = useState(null);
    const [base64Data, setBase64Data] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    // Helper function to format raw AI output as readable text
    const formatRawResult = (raw) => {
        if (!raw) return "";
        if (raw.text) return raw.text;

        let str = "";
        if (raw.condition) str += `Condition: ${raw.condition}\n\n`;
        if (raw.description) str += `Description: ${raw.description}\n\n`;
        if (raw.solutions && Array.isArray(raw.solutions)) {
            str += "Solutions:\n";
            raw.solutions.forEach((s) => {
                str += `• ${s}\n`;
            });
            str += "\n";
        }
        if (raw.confidence != null) str += `Confidence: ${raw.confidence}%\n`;

        return str.trim();
    };

    // Pick image from Gallery
    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission required", "Please allow photo library access.");
                return;
            }

            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.6, // Lower quality for faster processing
                base64: true, // This gets the base64 string directly - NO FileSystem needed
            });

            if (!res.canceled && res.assets && res.assets.length > 0) {
                const asset = res.assets[0];
                setImageUri(asset.uri);
                setBase64Data(asset.base64 || null);
                setResult(null);
            }
        } catch (err) {
            console.error("Pick Error:", err);
            Alert.alert("Error", "Could not pick image");
        }
    };

    // Take photo with Camera
    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission required", "Please allow camera access.");
                return;
            }

            const res = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.6,
                base64: true, // This gets the base64 string directly
            });

            if (!res.canceled && res.assets && res.assets.length > 0) {
                const asset = res.assets[0];
                setImageUri(asset.uri);
                setBase64Data(asset.base64 || null);
                setResult(null);
            }
        } catch (err) {
            console.error("Take Error:", err);
            Alert.alert("Error", "Could not take photo");
        }
    };

    // Analyze with AI
    const analyzeImage = async () => {
        if (!base64Data) {
            Alert.alert("No image", "Please pick or take a photo first.");
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            // Get User ID if logged in
            let userId = null;
            try {
                const savedProfile = await AsyncStorage.getItem('user_profile');
                if (savedProfile) {
                    const user = JSON.parse(savedProfile);
                    userId = user.id;
                }
            } catch (e) {
                console.log("Error fetching user profile:", e);
            }

            const payload = {
                user_id: userId,
                image: base64Data
            };

            const resp = await fetch(`${API_URL}/analyze-image`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.message || `Server error: ${resp.status}`);
            }

            const json = await resp.json();

            if (json.status !== 'success') {
                throw new Error(json.message || "Analysis failed");
            }

            const rawContent = json.result;

            // Clean AI JSON output
            let jsonText = typeof rawContent === "string" ? rawContent.trim() : JSON.stringify(rawContent);
            jsonText = jsonText.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();

            let parsed;
            try {
                const obj = JSON.parse(jsonText);
                parsed = {
                    condition: obj.condition || null,
                    confidence: obj.confidence || null,
                    description: obj.description || null,
                    solutions: obj.solutions || [],
                    raw: obj,
                };
            } catch (err) {
                parsed = {
                    raw: { text: rawContent },
                };
            }

            setResult(parsed);
        } catch (error) {
            console.error("Analysis Error:", error);
            Alert.alert("Error", error.message || "Analysis failed. Check your internet.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.outerContainer}>
            {/* Header Section */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#2196F3" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hosit Health Scanner</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.heading}>🔍 Health Concern Scanner</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Snapshot your concern</Text>

                    <View style={styles.row}>
                        <TouchableOpacity style={styles.button} onPress={pickImage}>
                            <View style={styles.buttonContent}>
                                <MaterialIcons name="photo-library" size={20} color="#fff" />
                                <Text style={styles.buttonText}>Gallery</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={takePhoto}>
                            <View style={styles.buttonContent}>
                                <MaterialIcons name="camera-alt" size={20} color="#2196F3" />
                                <Text style={[styles.buttonText, styles.outlineButtonText]}>Camera</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
                    ) : (
                        <View style={styles.previewPlaceholder}>
                            <MaterialIcons name="image-search" size={50} color="#dfefe6" />
                            <Text style={styles.placeholderText}>No image selected</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.analyzeButton, !base64Data && styles.disabledButton]}
                        onPress={analyzeImage}
                        disabled={!base64Data || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.analyzeText}>Analyze Now</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {result && (
                    <View style={styles.card}>
                        <Text style={styles.resultHeading}>Assessment Result</Text>

                        <View style={styles.resRow}>
                            <Text style={styles.bold}>Condition: </Text>
                            <Text style={styles.resVal}>{result.condition || "Undetermined"}</Text>
                        </View>

                        <View style={styles.resRow}>
                            <Text style={styles.bold}>Confidence: </Text>
                            <Text style={[styles.resVal, { color: result.confidence > 70 ? '#14833b' : '#f39c12' }]}>{result.confidence ? `${result.confidence}%` : "—"}</Text>
                        </View>

                        <Text style={styles.subHeading}>Assessment</Text>
                        <Text style={styles.paragraph}>
                            {result.description || "Analysis provided below."}
                        </Text>

                        <Text style={styles.subHeading}>Suggested Care</Text>
                        {result.solutions && result.solutions.length > 0 ? (
                            result.solutions.map((s, i) => (
                                <Text key={i} style={styles.paragraph}>• {s}</Text>
                            ))
                        ) : (
                            <Text style={styles.paragraph}>Check raw output for details.</Text>
                        )}

                        <View style={styles.warningBox}>
                            <MaterialIcons name="warning" size={16} color="#c0392b" />
                            <Text style={styles.warningText}>
                                Disclaimer: AI analysis only. See a doctor for medical advice.
                            </Text>
                        </View>

                        {result.raw?.text && (
                            <>
                                <Text style={[styles.small, { marginTop: 12 }]}>AI Note</Text>
                                <View style={styles.rawBox}>
                                    <Text style={styles.rawText}>{result.raw.text}</Text>
                                </View>
                            </>
                        )}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const PRIMARY = "#2196F3";
const BG = "#f7fff7";

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: BG,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        marginTop: Platform.OS === 'ios' ? 40 : 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    heading: {
        fontSize: 22,
        fontWeight: "700",
        color: "#083b14",
        marginBottom: 12,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 3,
    },
    label: {
        color: "#2b5a35",
        marginBottom: 8,
    },
    row: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    button: {
        flex: 1,
        backgroundColor: PRIMARY,
        paddingVertical: 10,
        borderRadius: 8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    outlineButton: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: PRIMARY,
    },
    outlineButtonText: {
        color: PRIMARY,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
    },
    preview: {
        width: "100%",
        height: 260,
        borderRadius: 8,
        marginBottom: 12,
    },
    previewPlaceholder: {
        width: "100%",
        height: 260,
        borderRadius: 8,
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "#dfefe6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    placeholderText: {
        color: "#8aa58a",
    },
    analyzeButton: {
        backgroundColor: PRIMARY,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    disabledButton: {
        opacity: 0.5,
    },
    analyzeText: {
        color: "#fff",
        fontWeight: "700",
    },
    resultHeading: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
        color: "#1b4620",
    },
    resRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    bold: {
        fontWeight: "700",
        color: "#13331f",
    },
    resVal: {
        color: PRIMARY,
        fontWeight: '600',
    },
    subHeading: {
        marginTop: 12,
        marginBottom: 4,
        fontWeight: "700",
        color: "#13331f",
    },
    paragraph: {
        color: "#234f2c",
        marginBottom: 6,
        lineHeight: 20,
    },
    warningBox: {
        marginTop: 16,
        padding: 10,
        backgroundColor: '#fff5f5',
        borderRadius: 8,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    warningText: {
        fontSize: 11,
        color: '#c0392b',
        flex: 1,
    },
    rawBox: {
        backgroundColor: "#f3fff4",
        padding: 8,
        borderRadius: 8,
        marginTop: 6,
    },
    rawText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 11,
        color: "#0a2d14",
    },
    small: {
        fontSize: 11,
        color: "#4a7a52",
    },
});
