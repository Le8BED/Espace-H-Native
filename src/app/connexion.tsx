import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useFlip } from '@/lib/flip';
import { C, EXTRANET, ombre } from '@/lib/theme';

// Connexion à l'espace client : arrivée en douceur (fondu + glissé), même
// thème que l'application ; une fois connecté, l'écran se retourne et entre
// dans l'espace client.
export default function Connexion() {
  const ins = useSafeAreaInsets();
  const { connecter } = useAuth();
  const { basculer } = useFlip();
  const [identifiant, setIdentifiant] = useState('');
  const [mdp, setMdp] = useState('');
  const [voir, setVoir] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');
  const apparition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(apparition, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [apparition]);

  const valider = async () => {
    if (!identifiant.trim() || !mdp) return setErreur('Indiquez votre identifiant et votre mot de passe.');
    setBusy(true);
    setErreur('');
    try {
      await connecter(identifiant.trim(), mdp);
      basculer(() => router.replace('/espace'));
    } catch (e) {
      setErreur((e as Error).message || 'Connexion impossible');
      setBusy(false);
    }
  };

  const translateY = apparition.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <LinearGradient colors={[C.navy2, C.navy, '#06182e']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} style={[st.fermer, { top: ins.top + 8 }]} accessibilityLabel="Fermer">
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <Animated.View style={[st.contenu, { paddingTop: ins.top + 60, opacity: apparition, transform: [{ translateY }] }]}>
          <View style={st.logo}>
            <Image source={require('../../assets/logo.png')} style={{ width: 62, height: 62 }} contentFit="contain" />
          </View>
          <Text style={st.titre}>Espace client</Text>
          <Text style={st.sous}>Propriétaire, locataire, domiciliation, équipe de l’agence</Text>

          <View style={st.carte}>
            <Text style={st.lib}>Identifiant</Text>
            <TextInput
              value={identifiant}
              onChangeText={setIdentifiant}
              placeholder="Ex. HK7M2Q9P"
              placeholderTextColor="#9aa3ae"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              style={st.champ}
              returnKeyType="next"
            />
            <Text style={st.lib}>Mot de passe</Text>
            <View>
              <TextInput
                value={mdp}
                onChangeText={setMdp}
                secureTextEntry={!voir}
                autoComplete="current-password"
                textContentType="password"
                style={[st.champ, { paddingRight: 46 }]}
                returnKeyType="go"
                onSubmitEditing={valider}
              />
              <Pressable onPress={() => setVoir((v) => !v)} style={st.oeil} accessibilityLabel={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                <Ionicons name={voir ? 'eye-off-outline' : 'eye-outline'} size={22} color={C.inkSoft} />
              </Pressable>
            </View>
            {erreur ? <Text style={st.erreur}>{erreur}</Text> : null}
            <Pressable onPress={valider} style={({ pressed }) => [st.bouton, (pressed || busy) && { opacity: 0.85 }]} disabled={busy}>
              {busy ? <ActivityIndicator color={C.navy} /> : <Text style={st.boutonTxt}>Se connecter</Text>}
            </Pressable>
            <Pressable onPress={() => Linking.openURL(`${EXTRANET}/mot-de-passe-oublie`)} style={{ marginTop: 14, alignSelf: 'center' }}>
              <Text style={{ color: C.inkSoft, textDecorationLine: 'underline' }}>Mot de passe oublié ?</Text>
            </Pressable>
            <Text style={st.note}>Vous restez connecté 30 jours sur ce téléphone.</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  fermer: { position: 'absolute', right: 16, zIndex: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  contenu: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },
  logo: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: C.brass, alignItems: 'center', justifyContent: 'center' },
  titre: { color: '#fff', fontSize: 30, fontWeight: '800', fontFamily: 'serif', marginTop: 16 },
  sous: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginTop: 4, textAlign: 'center' },
  carte: { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 26, padding: 20, marginTop: 24, borderWidth: 2, borderColor: 'rgba(200,150,44,0.55)', ...ombre },
  lib: { fontSize: 13, fontWeight: '700', color: C.inkSoft, marginBottom: 6, marginTop: 6 },
  champ: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: C.ink, marginBottom: 6 },
  oeil: { position: 'absolute', right: 12, top: 12 },
  erreur: { color: C.danger, marginTop: 6, fontSize: 14 },
  bouton: { backgroundColor: C.brass, borderRadius: 999, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  boutonTxt: { color: C.navy, fontWeight: '800', fontSize: 16.5 },
  note: { color: C.inkSoft, fontSize: 12.5, textAlign: 'center', marginTop: 12 },
});
