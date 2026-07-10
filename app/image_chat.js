import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageBot from '../components/ImageBot';

export default function ImageChatScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ImageBot />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
});
