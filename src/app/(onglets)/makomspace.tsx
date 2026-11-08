import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MakomMark } from '@/components/MakomLogo';
import { AGENCE } from '@/lib/theme';

// Onglet MAKOMSPACE, aux couleurs de MAKOMSPACE (comme sur le site, en
// sombre) : logo, accroche, texte, tarifs, infos pratiques, réservation.
// Sans la vidéo.

const M = {
  fond: '#0b1624',
  carte: '#10203a',
  carte2: '#152842',
  texte: '#f1ece2',
  doux: '#b3ab9c',
  or: '#d4ac72',
  orClair: '#e6c697',
  ligne: '#22324a',
  nuit: '#060e19',
};

const TARIFS: [string, string, string][] = [
  ['À l’heure', '35 €', '3 h minimum'],
  ['À la journée', '190 €', 'par jour ouvré'],
  ['À la semaine', '790 €', '7 jours'],
  ['Au mois', 'Sur demande', 'proposition sur mesure'],
];

export default function Makomspace() {
  const ins = useSafeAreaInsets();
  // Page sombre : heure et batterie en blanc, puis retour au sombre en quittant
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [])
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: M.fond }} contentContainerStyle={{ paddingTop: ins.top + 16, paddingHorizontal: 18, paddingBottom: 36 }}>
      {/* Logo */}
      <View style={st.logoCarte}>
        <MakomMark taille={96} couleur={M.or} id="makom-hero" />
        <Text style={st.mot}>
          <Text style={{ fontWeight: '700', color: M.or }}>MAKOM</Text>
          <Text style={{ fontWeight: '300', color: M.texte }}>SPACE</Text>
        </Text>
        <View style={st.trait} />
        <Text style={st.devise}>L’ESPACE QU’IL VOUS FAUT,{'\n'}POUR LE TEMPS QU’IL VOUS FAUT.</Text>
      </View>

      <Text style={st.kicker}>LOCATION DE SALLE — STRASBOURG</Text>
      <Text style={st.accroche}>L’espace qu’il vous faut, pour le temps qu’il vous faut.</Text>
      <Text style={st.texteFort}>
        Un rendez-vous décisif, une réunion d’équipe, un client à impressionner — et vous voilà au café du coin, entre le bruit de la machine à expresso et les tables voisines qui n’en perdent pas une miette ? Ce n’est plus une fatalité. Et vous n’avez pas non plus à signer un bail commercial de 6 mois, verser une caution et payer des frais d’agence pour un local que vous n’utiliserez que quelques heures par semaine.
      </Text>
      <Text style={st.texte}>
        Avec MAKOMSPACE, réservez en quelques clics une vraie salle professionnelle au cœur de Strasbourg — pour une réunion, un rendez-vous client ou une boutique éphémère — à l’heure, à la journée, à la semaine ou au mois. Sans frais d’agence. Sans caution. Sans engagement de durée.
      </Text>

      <View style={st.atouts}>
        {['Sans frais d’agence', 'Sans caution', 'Sans engagement'].map((t) => (
          <View key={t} style={st.atout}>
            <Ionicons name="checkmark" size={15} color={M.or} />
            <Text style={st.atoutTxt}>{t}</Text>
          </View>
        ))}
      </View>

      <Text style={st.h2}>Tarifs TTC</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {TARIFS.map(([l, p, n]) => (
          <View key={l} style={st.tarif}>
            <Text style={st.tarifLib}>{l.toUpperCase()}</Text>
            <Text style={st.tarifPrix}>{p}</Text>
            <Text style={st.petit}>{n}</Text>
          </View>
        ))}
      </View>
      <Text style={[st.petit, { marginTop: 10 }]}>
        Tarifs dégressifs selon la durée. Le vendredi après-midi, le samedi et le dimanche ne sont louables qu’au forfait mensuel.
      </Text>

      <Text style={st.h2}>Infos pratiques</Text>
      <View style={st.carte}>
        {[
          ['location-outline', AGENCE.adresse],
          ['time-outline', 'À l’heure : lundi au jeudi 9 h – 21 h, vendredi 9 h – 12 h'],
          ['key-outline', 'Accès du lundi au vendredi (jusqu’à 12 h 30 le vendredi). Le local vous est réservé en exclusivité sur toute la période choisie.'],
        ].map(([ic, t]) => (
          <View key={t} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7 }}>
            <Ionicons name={ic as any} size={19} color={M.or} />
            <Text style={[st.texte, { flex: 1, marginTop: 0 }]}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={[st.carte, { backgroundColor: M.nuit, borderColor: M.or }]}>
        <Text style={{ color: M.texte, fontSize: 18, fontWeight: '800' }}>Réserver un créneau</Text>
        <Text style={[st.texte, { marginTop: 6 }]}>Choisissez votre formule et vos dates, puis payez en ligne en toute sécurité.</Text>
        <Pressable onPress={() => router.push('/reserver/makomspace')} style={({ pressed }) => [st.bouton, pressed && { opacity: 0.85 }]}>
          <Text style={st.boutonTxt}>Réserver maintenant</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`tel:${AGENCE.tel}`)} style={({ pressed }) => [st.boutonContour, pressed && { opacity: 0.85 }]}>
          <Text style={st.boutonContourTxt}>Une question ? {AGENCE.telephone}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  logoCarte: { backgroundColor: M.carte, borderRadius: 24, borderWidth: 1, borderColor: M.ligne, paddingVertical: 36, paddingHorizontal: 20, alignItems: 'center' },
  mot: { fontSize: 30, letterSpacing: 5, marginTop: 22 },
  trait: { width: 60, height: 1.5, backgroundColor: M.or, marginTop: 18 },
  devise: { color: M.doux, fontSize: 11.5, letterSpacing: 3, textAlign: 'center', lineHeight: 20, marginTop: 16 },
  kicker: { color: M.or, fontSize: 12, fontWeight: '800', letterSpacing: 3, marginTop: 28 },
  accroche: { color: M.or, fontSize: 27, fontFamily: 'serif', lineHeight: 35, marginTop: 10 },
  texteFort: { color: M.texte, fontSize: 17, fontWeight: '600', lineHeight: 27, marginTop: 16 },
  texte: { color: M.doux, fontSize: 15, lineHeight: 23, marginTop: 12 },
  atouts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  atout: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: M.or, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  atoutTxt: { color: M.orClair, fontWeight: '700', fontSize: 13 },
  h2: { color: M.texte, fontSize: 22, fontFamily: 'serif', fontWeight: '700', marginTop: 28, marginBottom: 12 },
  tarif: { width: '48%', flexGrow: 1, backgroundColor: M.carte, borderRadius: 16, borderWidth: 1, borderColor: M.ligne, borderTopWidth: 2, borderTopColor: M.or, padding: 14 },
  tarifLib: { color: M.doux, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  tarifPrix: { color: M.texte, fontSize: 26, fontFamily: 'serif', fontWeight: '700', marginTop: 4 },
  petit: { color: M.doux, fontSize: 12.5, lineHeight: 18 },
  carte: { backgroundColor: M.carte, borderRadius: 20, borderWidth: 1, borderColor: M.ligne, padding: 16, marginBottom: 14 },
  bouton: { backgroundColor: M.or, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  boutonTxt: { color: M.nuit, fontWeight: '800', fontSize: 16 },
  boutonContour: { borderWidth: 1.5, borderColor: 'rgba(241,236,226,0.5)', borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  boutonContourTxt: { color: M.texte, fontWeight: '700', fontSize: 15 },
});
