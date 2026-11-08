import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bouton, Carte, Chargement, Message, s as ui } from '@/components/ui';
import { useBiens, type Lot } from '@/lib/biens';
import { eur } from '@/lib/format';
import { AGENCE, C, SITE } from '@/lib/theme';

// Onglet VEFA : programme neuf « Les Jardins de la Sauer » à Wœrth.
// Les lots, prix et rendements viennent du site (mêmes données que /programme).

const ETAGES: Record<string, string> = { '1er': '1er étage', '2e': '2e étage', Combles: 'Combles (duplex)' };
const nombre = (v: string) => Number(String(v).replace(',', '.').replace(/[^\d.]/g, '')) || 0;

export default function Vefa() {
  const ins = useSafeAreaInsets();
  const { lots, chargement, erreur, recharger } = useBiens();
  const [filtre, setFiltre] = useState('');

  const dispo = lots.filter((l) => !l.statut || /dispo/i.test(l.statut));
  const prixMin = dispo.length ? Math.min(...dispo.map((l) => l.prix)) : 0;
  const rendMax = dispo.length ? Math.max(...dispo.map((l) => nombre(l.rendement))) : 0;
  const types = useMemo(() => [...new Set(lots.map((l) => l.type))].sort(), [lots]);
  const parEtage = useMemo(() => {
    const g: Record<string, Lot[]> = {};
    lots.filter((l) => !filtre || l.type === filtre).forEach((l) => (g[l.etage] = [...(g[l.etage] || []), l]));
    return Object.entries(g);
  }, [lots, filtre]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={{ height: 330 }}>
        <Image source={{ uri: `${SITE}/photos/woerth-perspective-002.jpg` }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={['rgba(10,37,68,0.15)', 'rgba(10,37,68,0.92)']} style={StyleSheet.absoluteFill} />
        <View style={[st.hero, { paddingTop: ins.top + 10 }]}>
          <Text style={st.kicker}>EXCLUSIVITÉ AGENCE H · PROGRAMME NEUF</Text>
          <Text style={st.heroTitre}>Les Jardins de la Sauer</Text>
          <Text style={st.heroTexte}>
            À Wœrth, un programme neuf du T2 au T4, pensé pour l’investissement locatif saisonnier auprès de la clientèle frontalière allemande.
            {lots.length ? ` ${dispo.length} lots sur ${lots.length} en commercialisation (bâtiment A).` : ''}
          </Text>
        </View>
      </View>

      <View style={{ padding: 18 }}>
        <View style={st.chiffres}>
          {[
            [prixMin ? eur(prixMin) : '—', 'À partir de'],
            [types.length ? `${types[0]} à ${types[types.length - 1]}` : 'T2 à T4', 'Typologies'],
            ['≈ 4 %', 'Frais de notaire'],
          ].map(([v, l]) => (
            <View key={l} style={st.chiffre}>
              <Text style={st.chiffreVal}>{v}</Text>
              <Text style={st.chiffreLib}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={ui.h2}>Le programme</Text>
        {[
          ['leaf-outline', 'Le cadre', 'Un quartier neuf, largement arboré : jardins, cheminements piétons et place centrale paysagée.'],
          ['home-outline', 'Bâtiment A', `${lots.length || 15} appartements du T2 au T4, avec balcons, terrasses et duplex sous les toits.`],
          ['sunny-outline', 'Expositions', 'Sud, est ou sud-ouest selon les lots.'],
          ['cash-outline', 'Avantage du neuf', 'Frais de notaire réduits : environ 4 % du prix, contre 7 à 8 % dans l’ancien.'],
          ['trending-up-outline', 'Investissement', rendMax ? `Rendement estimé jusqu’à ${String(rendMax).replace('.', ',')} % en location saisonnière (estimation indicative).` : 'Location saisonnière auprès de la clientèle frontalière allemande.'],
        ].map(([ic, t, d]) => (
          <View key={t} style={st.point}>
            <View style={st.pointIcone}>
              <Ionicons name={ic as any} size={20} color={C.brass} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.pointTitre}>{t}</Text>
              <Text style={ui.petit}>{d}</Text>
            </View>
          </View>
        ))}

        <Text style={ui.h2}>Lots disponibles</Text>
        {erreur ? <Message type="erreur" texte="Impossible de charger les lots." action="Réessayer" onAction={recharger} /> : null}
        {chargement && !lots.length ? <Chargement /> : null}
        {types.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {['', ...types].map((t) => (
              <Pressable key={t || 'tous'} onPress={() => setFiltre(t)} style={[st.puce, filtre === t && st.puceActive]}>
                <Text style={[st.puceTxt, filtre === t && { color: '#fff' }]}>{t || 'Tous'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {parEtage.map(([etage, liste]) => (
          <View key={etage}>
            <Text style={st.etage}>{ETAGES[etage] || etage}</Text>
            {liste.map((l) => (
              <Carte key={l.lot} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={st.lotType}>
                    <Text style={st.lotTypeTxt}>{l.type}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.lotTitre}>
                      Lot {l.lot} · {String(l.surface).replace('.', ',')} m²
                    </Text>
                    <Text style={ui.petit}>{l.expo}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.lotPrix}>{eur(l.prix)}</Text>
                    <Text style={[ui.petit, { color: C.ok }]}>{l.rendement} estimé</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable style={st.lotBtn} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/plans/plan-${l.lot}.pdf`)}>
                    <Ionicons name="document-text-outline" size={16} color={C.navy} />
                    <Text style={st.lotBtnTxt}>Plan</Text>
                  </Pressable>
                  <Pressable
                    style={[st.lotBtn, { backgroundColor: C.navy, borderColor: C.navy, flex: 1.6 }]}
                    onPress={() => router.push({ pathname: '/reserver/vefa', params: { lot: l.lot } })}
                  >
                    <Text style={[st.lotBtnTxt, { color: '#fff' }]}>Réserver ce lot</Text>
                  </Pressable>
                </View>
              </Carte>
            ))}
          </View>
        ))}
        <Text style={[ui.petit, { marginTop: 4 }]}>
          Le rendement estimé est communiqué à titre indicatif. Le régime fiscal applicable (LMNP ou autre) dépend de votre situation personnelle : validez votre montage avec votre conseil fiscal ou votre notaire avant toute décision d’achat.
        </Text>

        <Carte style={{ marginTop: 18, backgroundColor: C.navy, borderColor: C.navy }}>
          <Text style={{ color: C.brassLight, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>VOTRE INTERLOCUTEUR UNIQUE</Text>
          <Text style={{ color: '#fff', fontSize: 16, marginTop: 6, lineHeight: 22 }}>
            Bureau de vente à Wœrth ou à l’agence, {AGENCE.adresse}.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Bouton titre="Appeler" onPress={() => Linking.openURL(`tel:${AGENCE.tel}`)} style={{ flex: 1 }} />
            <Bouton titre="Être rappelé" onPress={() => router.push({ pathname: '/contact', params: { sujet: 'Programme neuf – Les Jardins de la Sauer' } })} style={{ flex: 1 }} />
          </View>
        </Carte>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  kicker: { color: C.brassLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroTitre: { color: '#fff', fontSize: 32, fontWeight: '800', fontFamily: 'serif', marginTop: 6 },
  heroTexte: { color: 'rgba(255,255,255,0.85)', fontSize: 14.5, lineHeight: 20, marginTop: 8 },
  chiffres: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingVertical: 14, marginTop: -40 },
  chiffre: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  chiffreVal: { fontSize: 16, fontWeight: '800', color: C.navy, textAlign: 'center' },
  chiffreLib: { fontSize: 11.5, color: C.inkSoft, marginTop: 2, textAlign: 'center' },
  point: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  pointIcone: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fbf6ea', alignItems: 'center', justifyContent: 'center' },
  pointTitre: { fontWeight: '800', color: C.ink, fontSize: 15, marginBottom: 2 },
  puce: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  puceActive: { backgroundColor: C.navy, borderColor: C.navy },
  puceTxt: { fontWeight: '700', color: C.ink },
  etage: { fontSize: 13, fontWeight: '800', color: C.brass, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8, marginBottom: 8 },
  lotType: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  lotTypeTxt: { color: C.brassLight, fontWeight: '800', fontSize: 16 },
  lotTitre: { fontWeight: '800', color: C.ink, fontSize: 15 },
  lotPrix: { fontWeight: '800', color: C.navy, fontSize: 16 },
  lotBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.lineStrong, borderRadius: 999, paddingVertical: 9 },
  lotBtnTxt: { fontWeight: '800', color: C.navy, fontSize: 14 },
});
