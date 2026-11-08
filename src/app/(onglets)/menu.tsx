import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ecran } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useFlip } from '@/lib/flip';
import { initiales } from '@/lib/format';
import { AGENCE, C, ombre } from '@/lib/theme';

// Onglet Menu (style « Profil ») : carte espace client, tuiles, rubriques.
// Pastille « Passer à mon espace client » seulement quand on est connecté.

const TUILES: { titre: string; icone: keyof typeof Ionicons.glyphMap; aller: () => void; badge?: string }[] = [
  { titre: 'Nos biens', icone: 'key-outline', aller: () => router.navigate('/') },
  { titre: 'Programme neuf', icone: 'business-outline', aller: () => router.navigate('/vefa'), badge: 'VEFA' },
  { titre: 'Domiciliation', icone: 'mail-open-outline', aller: () => router.push('/infos/domiciliation') },
  { titre: 'MAKOMSPACE', icone: 'easel-outline', aller: () => router.navigate('/makomspace') },
  { titre: 'Pub sur notre écran', icone: 'tv-outline', aller: () => router.push('/reserver/pub'), badge: 'PUB' },
];

const RUBRIQUES: { titre: string; icone: keyof typeof Ionicons.glyphMap; page: string }[] = [
  { titre: 'Gestion locative', icone: 'clipboard-outline', page: 'gestion-locative' },
  { titre: 'L’agence', icone: 'information-circle-outline', page: 'agence' },
  { titre: 'Nous recrutons', icone: 'people-outline', page: 'recrutement' },
  { titre: 'Nous contacter', icone: 'chatbubbles-outline', page: 'contact' },
  { titre: 'Mentions légales', icone: 'document-text-outline', page: 'mentions' },
];

export default function Menu() {
  const ins = useSafeAreaInsets();
  const { user } = useAuth();
  const { basculer } = useFlip();
  const entrer = () => basculer(() => router.replace('/espace'));

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <Ecran basExtra={user ? 100 : 30}>
        <Text style={st.titre}>Menu</Text>
        <View style={st.trait} />

        {/* Espace client */}
        <Pressable onPress={user ? entrer : () => router.push('/connexion')} style={({ pressed }) => [st.carteCompte, pressed && { transform: [{ scale: 0.99 }] }]}>
          <View style={{ alignSelf: 'center' }}>
            {user ? (
              <View style={st.avatar}>
                <Text style={st.avatarTxt}>{initiales(user.name)}</Text>
              </View>
            ) : (
              <View style={st.avatar}>
                <Image source={require('../../../assets/logo.png')} style={{ width: 74, height: 74 }} contentFit="contain" />
              </View>
            )}
            <View style={st.avatarBadge}>
              <Ionicons name="person" size={18} color={C.navy} />
            </View>
          </View>
          <Text style={st.compteTitre}>{user ? `Bonjour ${user.name.split(' ')[0]}` : 'Mon espace client'}</Text>
          <Text style={st.compteSous}>{user ? 'Vous êtes connecté à votre espace client.' : 'Propriétaire, locataire, domiciliation…'}</Text>
          <View style={st.compteBtn}>
            <Text style={st.compteBtnTxt}>{user ? 'Accéder à mon espace' : 'Se connecter'}</Text>
          </View>
        </Pressable>

        <View style={st.grille}>
          {TUILES.map((t) => (
            <Pressable key={t.titre} onPress={t.aller} style={({ pressed }) => [st.tuile, pressed && { transform: [{ scale: 0.98 }] }]}>
              {t.badge ? <Text style={st.badge}>{t.badge}</Text> : null}
              <Ionicons name={t.icone} size={38} color={C.brass} />
              <Text style={st.tuileTxt}>{t.titre}</Text>
            </Pressable>
          ))}
        </View>

        <View style={st.liste}>
          {RUBRIQUES.map((r, i) => (
            <Pressable key={r.page} onPress={() => router.push(`/infos/${r.page}`)} style={[st.ligne, i > 0 && st.ligneBord]}>
              <Ionicons name={r.icone} size={23} color={C.navy} />
              <Text style={st.ligneTxt}>{r.titre}</Text>
              <Ionicons name="chevron-forward" size={20} color={C.brass} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => Linking.openURL(`tel:${AGENCE.tel}`)}>
          <Text style={st.pied}>
            {AGENCE.nom} · {AGENCE.adresse} · <Text style={{ color: C.brass, textDecorationLine: 'underline' }}>{AGENCE.telephone}</Text>
          </Text>
        </Pressable>
      </Ecran>

      {user ? (
        <Pressable onPress={entrer} style={[st.pastille, { bottom: 16 }]}>
          <Text style={{ color: C.brassLight, fontSize: 18 }}>⇄</Text>
          <Text style={st.pastilleTxt}>Passer à mon espace client</Text>
        </Pressable>
      ) : null}
      <View style={{ height: 0, paddingBottom: ins.bottom ? 0 : 0 }} />
    </View>
  );
}

const st = StyleSheet.create({
  titre: { fontSize: 36, fontWeight: '800', color: C.ink, fontFamily: 'serif', marginTop: 6 },
  trait: { width: 46, height: 3, backgroundColor: C.brass, marginTop: 6, marginBottom: 18, borderRadius: 2 },
  carteCompte: { backgroundColor: C.navy, borderRadius: 28, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(200,150,44,0.6)', ...ombre },
  avatar: { width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(200,150,44,0.55)', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: C.brassLight, fontSize: 38, fontWeight: '800', fontFamily: 'serif' },
  avatarBadge: { position: 'absolute', right: -2, bottom: -2, width: 38, height: 38, borderRadius: 19, backgroundColor: C.brass, borderWidth: 4, borderColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  compteTitre: { color: '#fff', fontSize: 27, fontWeight: '800', fontFamily: 'serif', marginTop: 14, textAlign: 'center' },
  compteSous: { color: 'rgba(255,255,255,0.75)', fontSize: 15, marginTop: 4, textAlign: 'center' },
  compteBtn: { backgroundColor: C.brass, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 11, marginTop: 16 },
  compteBtnTxt: { color: C.navy, fontWeight: '800', fontSize: 15.5 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  tuile: { width: '48%', flexGrow: 1, height: 140, backgroundColor: C.surface, borderRadius: 24, padding: 16, justifyContent: 'space-between', borderWidth: 1, borderColor: C.line, ...ombre },
  tuileTxt: { fontSize: 16.5, fontWeight: '800', color: C.ink },
  badge: { position: 'absolute', right: 12, top: 12, backgroundColor: C.brass, color: C.navy, fontSize: 10, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  liste: { backgroundColor: C.surface, borderRadius: 24, marginTop: 16, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...ombre },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 15 },
  ligneBord: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  ligneTxt: { flex: 1, fontSize: 16, color: C.ink, fontWeight: '600' },
  pied: { textAlign: 'center', color: C.inkSoft, fontSize: 13, marginTop: 18, lineHeight: 19 },
  pastille: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.navy, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 14, borderWidth: 2, borderColor: 'rgba(200,150,44,0.7)', ...ombre },
  pastilleTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
