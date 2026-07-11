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
            <Stack.Screen name="voice_chat" options={{ title: 'Voice Chat' }} />
            <Stack.Screen name="nearby_doctors" options={{ title: 'Nearby Doctors' }} />
            <Stack.Screen name="doctor_auth" options={{ title: 'Doctor Login', headerShown: false }} />
            <Stack.Screen name="doctor_dashboard" options={{ title: 'Doctor Dashboard', headerShown: false }} />
            <Stack.Screen name="nearby_labs" options={{ title: 'Nearby Laboratories' }} />
            <Stack.Screen name="lab_profile" options={{ title: 'Laboratory Profile' }} />
            <Stack.Screen name="lab_auth" options={{ title: 'Laboratory Login', headerShown: false }} />
            <Stack.Screen name="lab_dashboard" options={{ title: 'Laboratory Dashboard', headerShown: false }} />
            <Stack.Screen name="lab_reports" options={{ title: 'Lab Reports' }} />
            <Stack.Screen name="diet_monitoring" options={{ title: 'Diet Monitoring' }} />
            <Stack.Screen name="diet_plan" options={{ title: 'Diet Plan' }} />
            <Stack.Screen name="doctor_diet_prescription" options={{ title: 'Diet Prescription' }} />
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
