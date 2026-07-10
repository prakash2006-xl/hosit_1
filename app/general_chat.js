import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConversationalBot from '../components/ConversationalBot';

export default function GeneralChatScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ConversationalBot />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
});
