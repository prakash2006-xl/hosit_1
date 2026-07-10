import { Stack } from 'expo-router';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

function RootLayoutNav() {
    const { t } = useLanguage();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#2196F3', // Primary Blue
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                headerRight: () => <LanguageSwitcher />,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Hosit' }} />
            <Stack.Screen name="auth" options={{ title: t('navigation.login'), headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ title: t('navigation.onboarding') }} />
            <Stack.Screen name="profile" options={{ title: t('navigation.profile') }} />
            <Stack.Screen name="dashboard" options={{ title: t('navigation.home') }} />
            <Stack.Screen name="history" options={{ title: t('navigation.history') }} />
            <Stack.Screen name="assessment" options={{ title: t('navigation.assessment') }} />
            <Stack.Screen name="general_chat" options={{ title: 'Hosit General Chat' }} />
            <Stack.Screen name="image_chat" options={{ title: 'Image Analysis' }} />
            <Stack.Screen name="guardian" options={{ title: 'Guardian AI Emergency' }} />
        </Stack>
    );
}

export default function Layout() {
    return (
        <LanguageProvider>
            <RootLayoutNav />
        </LanguageProvider>
    );
}
