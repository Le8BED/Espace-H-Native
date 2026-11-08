import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';

// Choix d'une date (prochains jours ouvrés) et d'un créneau horaire.

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dateDe = (s: string) => new Date(`${s}T12:00:00`);
export const ajouterJours = (s: string, n: number) => {
  const d = dateDe(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export function prochainsJours(nb: number, filtre: (d: Date) => boolean = (d) => d.getDay() !== 0 && d.getDay() !== 6, depuis = 0) {
  const res: string[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + depuis);
  while (res.length < nb) {
    if (filtre(d)) res.push(iso(d));
    d.setDate(d.getDate() + 1);
  }
  return res;
}

export function ChoixJour({ jours, valeur, onChange, indisponibles = [] }: { jours: string[]; valeur: string; onChange: (j: string) => void; indisponibles?: string[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      {jours.map((j) => {
        const d = dateDe(j);
        const actif = j === valeur;
        const off = indisponibles.includes(j);
        return (
          <Pressable key={j} disabled={off} onPress={() => onChange(j)} style={[st.jour, actif && st.jourActif, off && { opacity: 0.35 }]}>
            <Text style={[st.jourSem, actif && { color: C.brassLight }]}>{JOURS[d.getDay()]}</Text>
            <Text style={[st.jourNum, actif && { color: '#fff' }]}>{d.getDate()}</Text>
            <Text style={[st.jourMois, actif && { color: 'rgba(255,255,255,0.75)' }]}>{MOIS_C[d.getMonth()]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ChoixHeure({ heures, valeur, onChange, prises = [] }: { heures: string[]; valeur: string; onChange: (h: string) => void; prises?: string[] }) {
  if (!heures.length) return <Text style={{ color: C.inkSoft, marginBottom: 12 }}>Aucun créneau ce jour-là.</Text>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {heures.map((h) => {
        const off = prises.includes(h);
        const actif = h === valeur;
        return (
          <Pressable key={h} disabled={off} onPress={() => onChange(h)} style={[st.heure, actif && st.jourActif, off && { opacity: 0.3 }]}>
            <Text style={[st.heureTxt, actif && { color: '#fff' }, off && { textDecorationLine: 'line-through' }]}>{h}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function dateLongue(s: string) {
  const d = dateDe(s);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const st = StyleSheet.create({
  jour: { width: 64, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', marginRight: 8, backgroundColor: C.surface },
  jourActif: { backgroundColor: C.navy, borderColor: C.navy },
  jourSem: { fontSize: 12, color: C.inkSoft, fontWeight: '700' },
  jourNum: { fontSize: 20, fontWeight: '800', color: C.ink },
  jourMois: { fontSize: 11.5, color: C.inkSoft },
  heure: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: C.surface },
  heureTxt: { fontWeight: '700', color: C.ink },
});
