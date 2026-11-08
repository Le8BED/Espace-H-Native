import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Bien } from '@/lib/biens';
import { eur } from '@/lib/format';
import { C, ombre } from '@/lib/theme';

// Cartes de biens : grande carte (liste) et carte « exclusivité » (carrousel).

export const libelleTransaction = (t: string) => (t === 'location' ? 'À louer' : 'À vendre');
const prix = (b: Bien) => `${eur(b.price)}${b.transaction_type === 'location' ? ' / mois' : ''}`;

export function CarteBien({ b }: { b: Bien }) {
  return (
    <Pressable onPress={() => router.push(`/bien/${encodeURIComponent(b.ref)}`)} style={({ pressed }) => [st.carte, pressed && { transform: [{ scale: 0.985 }] }]}>
      <View style={st.photoBox}>
        <Image source={{ uri: b.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        <View style={st.badges}>
          <Text style={st.badgeType}>{b.type}</Text>
          <Text style={st.badgeTrans}>{libelleTransaction(b.transaction_type)}</Text>
        </View>
        {b.status && b.status !== 'disponible' ? <Text style={st.badgeStatut}>{b.status}</Text> : null}
      </View>
      <View style={{ padding: 14 }}>
        <Text style={st.prix}>{prix(b)}</Text>
        <Text style={st.titre} numberOfLines={2}>
          {b.title}
        </Text>
        <Text style={st.lieu}>
          {[b.quartier || b.city, b.postal_code].filter(Boolean).join(' · ')}
        </Text>
        <Text style={st.specs}>{[b.surface ? `${b.surface} m²` : '', b.pieces ? `${b.pieces} pièce${b.pieces > 1 ? 's' : ''}` : '', b.chambres ? `${b.chambres} ch.` : ''].filter(Boolean).join('  ·  ')}</Text>
      </View>
    </Pressable>
  );
}

export function CarteSelection({ b, exclusif }: { b: Bien; exclusif: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/bien/${encodeURIComponent(b.ref)}`)} style={st.sel}>
      <Image source={{ uri: b.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.35 }} end={{ x: 0, y: 1 }} />
      {exclusif ? <Text style={st.excl}>EXCLUSIVITÉ</Text> : null}
      <View style={st.selBas}>
        <Text style={st.selPrix}>{prix(b)}</Text>
        <Text style={st.selTitre} numberOfLines={1}>
          {b.title}
        </Text>
        <Text style={st.selSpecs} numberOfLines={1}>
          {[b.city, b.surface ? `${b.surface} m²` : '', b.pieces ? `${b.pieces} p.` : ''].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  carte: { backgroundColor: C.surface, borderRadius: 22, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: C.line, ...ombre },
  photoBox: { aspectRatio: 4 / 3, backgroundColor: C.line },
  badges: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', gap: 6 },
  badgeType: { backgroundColor: C.navy, color: '#fff', fontSize: 12, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  badgeTrans: { backgroundColor: C.brass, color: C.navy, fontSize: 12, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  badgeStatut: { position: 'absolute', right: 12, top: 12, backgroundColor: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', textTransform: 'capitalize' },
  prix: { fontSize: 22, fontWeight: '800', color: C.navy, fontFamily: 'serif' },
  titre: { fontSize: 15.5, color: C.ink, marginTop: 3, fontWeight: '600' },
  lieu: { fontSize: 13.5, color: C.inkSoft, marginTop: 3 },
  specs: { fontSize: 13.5, color: C.ink, marginTop: 8, fontWeight: '600' },
  sel: { width: 260, height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: C.navy, marginRight: 14, ...ombre },
  excl: { position: 'absolute', left: 12, top: 12, backgroundColor: C.brass, color: C.navy, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  selBas: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  selPrix: { color: '#fff', fontSize: 21, fontWeight: '800', fontFamily: 'serif' },
  selTitre: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 2 },
  selSpecs: { color: 'rgba(255,255,255,0.72)', fontSize: 12.5, marginTop: 2 },
});
