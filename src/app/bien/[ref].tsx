import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Dimensions, FlatList, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { libelleTransaction } from '@/components/biens';
import { Bouton, Carte, Ligne, s as ui } from '@/components/ui';
import { useBiens } from '@/lib/biens';
import { eur } from '@/lib/format';
import { AGENCE, C } from '@/lib/theme';

// Fiche d'un bien : photos, prix, caractéristiques, description, contact.
const L = Dimensions.get('window').width;

export default function FicheBien() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const ins = useSafeAreaInsets();
  const { biens } = useBiens();
  const [photo, setPhoto] = useState(0);
  const b = biens.find((x) => x.ref === decodeURIComponent(String(ref || '')));

  if (!b) {
    return (
      <View style={{ flex: 1, paddingTop: ins.top + 20, padding: 20, backgroundColor: C.ground }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: C.brass, fontWeight: '700' }}>‹ Retour</Text>
        </Pressable>
        <Text style={[ui.texte, { marginTop: 20 }]}>Ce bien n’est plus disponible.</Text>
      </View>
    );
  }
  const loc = b.transaction_type === 'location';

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + 110 }}>
        <View>
          <FlatList
            data={b.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u, i) => `${i}-${u}`}
            onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / L))}
            renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: L, height: L * 0.78 }} contentFit="cover" transition={200} />}
          />
          <View style={[st.barreHaut, { top: ins.top + 8 }]}>
            <Pressable onPress={() => router.back()} style={st.rond} accessibilityLabel="Retour">
              <Ionicons name="chevron-back" size={24} color={C.navy} />
            </Pressable>
            <Pressable onPress={() => Share.share({ message: `${b.title} — ${eur(b.price)}\n${b.url}` })} style={st.rond} accessibilityLabel="Partager">
              <Ionicons name="share-outline" size={22} color={C.navy} />
            </Pressable>
          </View>
          {b.photos.length > 1 && (
            <View style={st.points}>
              {b.photos.map((_, i) => (
                <View key={i} style={[st.point, i === photo && { backgroundColor: '#fff', width: 18 }]} />
              ))}
            </View>
          )}
        </View>

        <View style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            <Text style={st.badge}>{b.type}</Text>
            <Text style={[st.badge, { backgroundColor: C.brass, color: C.navy }]}>{libelleTransaction(b.transaction_type)}</Text>
            {b.exclusif ? <Text style={[st.badge, { backgroundColor: C.navy2 }]}>Exclusivité</Text> : null}
          </View>
          <Text style={st.prix}>
            {eur(b.price)}
            {loc ? <Text style={{ fontSize: 16 }}> / mois</Text> : null}
          </Text>
          <Text style={st.titre}>{b.title}</Text>
          <Text style={st.lieu}>
            <Ionicons name="location-outline" size={14} /> {[b.quartier, b.city, b.postal_code].filter(Boolean).join(' · ')}
          </Text>

          <View style={st.chiffres}>
            {[
              [b.surface ? `${b.surface} m²` : '—', 'Surface'],
              [b.pieces || '—', 'Pièces'],
              [b.chambres || '—', 'Chambres'],
              [b.dpe || '—', 'DPE'],
            ].map(([v, l]) => (
              <View key={String(l)} style={st.chiffre}>
                <Text style={st.chiffreVal}>{String(v)}</Text>
                <Text style={st.chiffreLib}>{String(l)}</Text>
              </View>
            ))}
          </View>

          {b.description ? (
            <>
              <Text style={ui.h2}>Description</Text>
              <Text style={ui.texte}>{b.description}</Text>
            </>
          ) : null}

          <Text style={ui.h2}>Caractéristiques</Text>
          <Carte>
            {b.etat ? <Ligne libelle="État" valeur={b.etat} /> : null}
            {b.construction ? <Ligne libelle="Construction" valeur={b.construction} /> : null}
            {b.floor_position ? <Ligne libelle="Étage" valeur={b.floor_position} /> : null}
            <Ligne libelle="Ascenseur" valeur={b.elevator ? 'Oui' : 'Non'} />
            {b.exposition ? <Ligne libelle="Exposition" valeur={b.exposition} /> : null}
            {b.exterior.length ? <Ligne libelle="Extérieurs" valeur={b.exterior.join(', ')} /> : null}
            <Ligne libelle="Référence" valeur={b.ref} />
          </Carte>
          {b.features.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {b.features.map((f) => (
                <Text key={f} style={st.atout}>
                  ✓ {f}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Contact */}
      <View style={[st.bas, { paddingBottom: Math.max(ins.bottom, 12) }]}>
        <Bouton titre="Appeler" variante="contour" onPress={() => Linking.openURL(`tel:${AGENCE.tel}`)} icone={<Ionicons name="call-outline" size={18} color={C.ink} />} style={{ flex: 1 }} />
        <Bouton titre={loc ? 'Demander une visite' : 'Être recontacté'} onPress={() => router.push({ pathname: '/contact', params: { sujet: 'Visite d’un bien', ref: b.ref } })} style={{ flex: 1.6 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  barreHaut: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' },
  rond: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  points: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  point: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  badge: { backgroundColor: C.navy, color: '#fff', fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  prix: { fontSize: 30, fontWeight: '800', color: C.navy, fontFamily: 'serif' },
  titre: { fontSize: 18, color: C.ink, fontWeight: '700', marginTop: 4 },
  lieu: { fontSize: 14, color: C.inkSoft, marginTop: 6 },
  chiffres: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.line, marginTop: 16, paddingVertical: 14 },
  chiffre: { flex: 1, alignItems: 'center' },
  chiffreVal: { fontSize: 17, fontWeight: '800', color: C.ink },
  chiffreLib: { fontSize: 12, color: C.inkSoft, marginTop: 2 },
  atout: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, color: C.ink, fontSize: 13.5, overflow: 'hidden' },
  bas: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line },
});
