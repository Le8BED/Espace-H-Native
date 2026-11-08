import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { BiensProvider } from '@/lib/biens';
import { FlipProvider } from '@/lib/flip';
import { C } from '@/lib/theme';

// Application Espace H — Agence H Immobilier (React Native / Expo).
// Onglets : Recherche · VEFA · MAKOMSPACE · Menu ; espace client natif après
// connexion (l'écran se retourne à l'entrée et à la sortie).
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BiensProvider>
          <FlipProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ground } }}>
              <Stack.Screen name="(onglets)" />
              <Stack.Screen name="bien/[ref]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="infos/[page]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="connexion" options={{ animation: 'fade', presentation: 'transparentModal' }} />
              <Stack.Screen name="espace" options={{ animation: 'none', gestureEnabled: false }} />
            </Stack>
          </FlipProvider>
        </BiensProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
