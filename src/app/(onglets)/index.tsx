import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CarteBien, CarteSelection } from '@/components/biens';
import { Chargement, Message, s as ui } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useBiens, type Bien } from '@/lib/biens';
import { useFlip } from '@/lib/flip';
import { initiales } from '@/lib/format';
import { C, ombre } from '@/lib/theme';

// Onglet « Recherche » (page d'arrivée de l'application) :
//  - logo à gauche ; à droite la pastille du compte (initiales) si connecté ;
//  - barre de recherche : au toucher, les filtres se déplient ;
//  - « Exclusivités du moment » (ou « Sélection du moment »), puis tous les
//    biens dans un ordre aléatoire.
// ?mode=achat | ?mode=location : présélection (depuis l'espace propriétaire /
// locataire, « mode acquéreur » / « mode locataire »).

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);

type Transaction = '' | 'acquisition' | 'location';

function melanger<T>(l: T[]): T[] {
  const a = [...l];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Recherche() {
  const ins = useSafeAreaInsets();
  const { biens, chargement, erreur, recharger } = useBiens();
  const { user } = useAuth();
  const { basculer } = useFlip();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [ouvert, setOuvert] = useState(false);
  const [transaction, setTransaction] = useState<Transaction>('');
  const [ville, setVille] = useState('');
  const [type, setType] = useState('');
  const [budget, setBudget] = useState('');
  const [surface, setSurface] = useState('');
  const [pieces, setPieces] = useState(0);
  const [ordre, setOrdre] = useState<Bien[]>([]);

  useEffect(() => {
    if (params.mode === 'achat') setTransaction('acquisition');
    else if (params.mode === 'location') setTransaction('location');
  }, [params.mode]);
  useEffect(() => setOrdre(melanger(biens)), [biens]);

  const villes = useMemo(() => [...new Set(biens.map((b) => b.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [biens]);
  const types = useMemo(() => [...new Set(biens.map((b) => b.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [biens]);

  const filtreActif = !!(transaction || ville || type || budget || surface || pieces);
  const resultats = useMemo(() => {
    const bmax = Number(budget) || 0;
    const smin = Number(surface) || 0;
    const v = ville.trim().toLowerCase();
    return ordre.filter(
      (p) =>
        (!transaction || p.transaction_type === transaction) &&
        (!v || (p.city || '').toLowerCase().includes(v) || (p.postal_code || '').startsWith(v)) &&
        (!type || p.type === type) &&
        (!bmax || p.price <= bmax) &&
        (!smin || p.surface >= smin) &&
        (!pieces || p.pieces >= pieces)
    );
  }, [ordre, transaction, ville, type, budget, surface, pieces]);

  // Exclusivités : biens dont l'annonce dit « exclusivité » ; sinon « Sélection
  // du moment » sans badge (pas de fausse mention d'exclusivité).
  const { selection, exclusifs } = useMemo(() => {
    const dispo = biens.filter((p) => !p.status || p.status === 'disponible');
    const m = dispo.filter((p) => p.exclusif);
    return m.length ? { selection: m.slice(0, 8), exclusifs: true } : { selection: dispo.slice(0, 6), exclusifs: false };
  }, [biens]);

  const basculerFiltres = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOuvert((o) => !o);
  };
  const effacer = () => {
    setTransaction('');
    setVille('');
    setType('');
    setBudget('');
    setSurface('');
    setPieces(0);
  };
  const resume = [
    transaction === 'acquisition' ? 'Acheter' : transaction === 'location' ? 'Louer' : '',
    ville,
    type,
    budget ? `≤ ${Number(budget).toLocaleString('fr-FR')} €` : '',
    surface ? `≥ ${surface} m²` : '',
    pieces ? `${pieces}+ p.` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const entete = (
    <View>
      {/* Barre de recherche */}
      <View style={[st.recherche, ouvert && { padding: 14 }]}>
        <Pressable onPress={basculerFiltres} style={st.rechercheHaut}>
          <View style={st.loupe}>
            <Ionicons name="search" size={20} color={C.brassLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.rechTitre} numberOfLines={1}>
              {resume || 'Rechercher un bien'}
            </Text>
            <Text style={st.rechSous} numberOfLines={1}>
              {resume ? `${resultats.length} bien${resultats.length > 1 ? 's' : ''}` : 'Acheter ou louer · ville · budget · surface'}
            </Text>
          </View>
          <Ionicons name={ouvert ? 'chevron-up' : 'options-outline'} size={22} color={C.inkSoft} />
        </Pressable>

        {ouvert && (
          <View style={{ marginTop: 12 }}>
            <View style={st.segment}>
              {(
                [
                  ['', 'Tous'],
                  ['acquisition', 'Acheter'],
                  ['location', 'Louer'],
                ] as [Transaction, string][]
              ).map(([v, l]) => (
                <Pressable key={l} onPress={() => setTransaction(v)} style={[st.segBtn, transaction === v && st.segActif]}>
                  <Text style={[st.segTxt, transaction === v && { color: '#fff' }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={st.lib}>Ville ou code postal</Text>
            <TextInput value={ville} onChangeText={setVille} placeholder="Strasbourg, 67000…" placeholderTextColor="#9aa3ae" style={st.champ} />
            {ville.length > 0 && !villes.some((v) => v.toLowerCase() === ville.toLowerCase()) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {villes
                  .filter((v) => v.toLowerCase().includes(ville.toLowerCase()))
                  .slice(0, 8)
                  .map((v) => (
                    <Pressable key={v} onPress={() => setVille(v)} style={st.puce}>
                      <Text style={st.puceTxt}>{v}</Text>
                    </Pressable>
                  ))}
              </ScrollView>
            )}
            <Text style={st.lib}>Type de bien</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['', ...types].map((t) => (
                <Pressable key={t || 'tous'} onPress={() => setType(t)} style={[st.puce, type === t && st.puceActive]}>
                  <Text style={[st.puceTxt, type === t && { color: '#fff' }]}>{t || 'Tous'}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={st.lib}>Budget max (€)</Text>
                <TextInput value={budget} onChangeText={(t) => setBudget(t.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="300 000" placeholderTextColor="#9aa3ae" style={st.champ} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.lib}>Surface min (m²)</Text>
                <TextInput value={surface} onChangeText={(t) => setSurface(t.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="60" placeholderTextColor="#9aa3ae" style={st.champ} />
              </View>
            </View>
            <Text style={st.lib}>Pièces</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setPieces(n)} style={[st.piece, pieces === n && st.puceActive]}>
                  <Text style={[st.puceTxt, pieces === n && { color: '#fff' }]}>{n === 0 ? 'Tout' : n === 5 ? '5+' : n}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <Pressable onPress={effacer}>
                <Text style={{ color: C.ink, fontWeight: '700', textDecorationLine: 'underline' }}>Effacer</Text>
              </Pressable>
              <Pressable onPress={basculerFiltres} style={st.voir}>
                <Text style={st.voirTxt}>
                  Voir {resultats.length} bien{resultats.length > 1 ? 's' : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {erreur ? <Message type="erreur" texte={`Impossible de charger les biens (${erreur}).`} action="Réessayer" onAction={recharger} /> : null}
      {chargement && !biens.length ? <Chargement texte="Chargement des biens…" /> : null}

      {!filtreActif && selection.length > 0 && (
        <>
          <Text style={ui.h2}>{exclusifs ? 'Exclusivités du moment' : 'Sélection du moment'}</Text>
          <FlatList horizontal data={selection} keyExtractor={(b) => `sel-${b.ref}`} renderItem={({ item }) => <CarteSelection b={item} exclusif={exclusifs} />} showsHorizontalScrollIndicator={false} snapToInterval={274} decelerationRate="fast" style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18 }} />
        </>
      )}
      {biens.length > 0 && (
        <Text style={ui.h2}>
          {filtreActif ? (transaction === 'acquisition' ? 'Biens à l’achat' : transaction === 'location' ? 'Biens à la location' : 'Résultats') : 'Tous nos biens'}
          {filtreActif ? <Text style={{ fontSize: 15, color: C.inkSoft }}> ({resultats.length})</Text> : null}
        </Text>
      )}
      {filtreActif && biens.length > 0 && resultats.length === 0 ? <Message texte="Aucun bien ne correspond pour l’instant." action="Effacer les filtres" onAction={effacer} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      {/* En-tête : logo à gauche, compte à droite */}
      <View style={[st.haut, { paddingTop: ins.top + 6 }]}>
        <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={effacer}>
          <Image source={require('../../../assets/logo.png')} style={{ width: 44, height: 44 }} contentFit="contain" />
          <View>
            <Text style={st.marque}>Agence H</Text>
            <Text style={st.marqueSous}>IMMOBILIER</Text>
          </View>
        </Pressable>
        {user ? (
          <Pressable onPress={() => basculer(() => router.replace('/espace'))} style={st.compte} accessibilityLabel="Mon espace client">
            <Text style={st.compteTxt}>{initiales(user.name)}</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={filtreActif ? resultats : ordre}
        keyExtractor={(b) => b.ref}
        renderItem={({ item }) => <CarteBien b={item} />}
        ListHeaderComponent={entete}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        onRefresh={recharger}
        refreshing={chargement && biens.length > 0}
        initialNumToRender={6}
      />
    </View>
  );
}

const st = StyleSheet.create({
  haut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10, backgroundColor: C.ground },
  marque: { fontSize: 19, fontWeight: '800', color: C.ink, fontFamily: 'serif' },
  marqueSous: { fontSize: 10, letterSpacing: 2.5, color: C.brass, fontWeight: '700' },
  compte: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.navy, borderWidth: 2, borderColor: C.brass, alignItems: 'center', justifyContent: 'center', ...ombre },
  compteTxt: { color: C.brassLight, fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  recherche: { backgroundColor: C.surface, borderRadius: 26, padding: 6, borderWidth: 1, borderColor: C.line, marginTop: 4, ...ombre },
  rechercheHaut: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 6 },
  loupe: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  rechTitre: { fontSize: 15.5, fontWeight: '700', color: C.ink },
  rechSous: { fontSize: 12.5, color: C.inkSoft, marginTop: 1 },
  segment: { flexDirection: 'row', backgroundColor: C.ground, borderRadius: 999, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  segActif: { backgroundColor: C.navy },
  segTxt: { fontWeight: '700', color: C.inkSoft },
  lib: { fontSize: 12.5, fontWeight: '700', color: C.inkSoft, marginTop: 12, marginBottom: 5 },
  champ: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.ink, backgroundColor: C.surface },
  puce: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  puceActive: { backgroundColor: C.navy, borderColor: C.navy },
  puceTxt: { fontWeight: '700', color: C.ink, fontSize: 13.5 },
  piece: { flex: 1, borderWidth: 1, borderColor: C.lineStrong, borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  voir: { flex: 1, backgroundColor: C.brass, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  voirTxt: { color: C.navy, fontWeight: '800', fontSize: 15.5 },
});
