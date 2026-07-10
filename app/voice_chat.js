
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceBot from '../components/VoiceBot';

export default function VoiceChatScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <VoiceBot />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
});
