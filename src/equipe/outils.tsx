import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chargement, Ecran, Message } from '@/components/ui';
import { EnteteEspace } from '@/espace/commun';
import { C } from '@/lib/theme';

// Outils communs aux écrans de l'équipe.

export function Section({
  titre,
  sous,
  chargement,
  erreur,
  onRefresh,
  children,
  action,
}: {
  titre: string;
  sous?: string;
  chargement?: boolean;
  erreur?: string;
  onRefresh?: () => void;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Ecran onRefresh={onRefresh} refreshing={!!chargement} basExtra={160}>
      <EnteteEspace titre={titre} sous={sous} />
      {action}
      {erreur ? <Message type="erreur" texte={erreur} action={onRefresh ? 'Réessayer' : undefined} onAction={onRefresh} /> : null}
      {children}
      {chargement ? <Chargement /> : null}
    </Ecran>
  );
}

// Exécute une action serveur avec indicateur et message d'erreur.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const lancer = useCallback(async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) Alert.alert('C’est fait', ok);
      return true;
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message || 'Action impossible');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, lancer };
}

export function confirmer(titre: string, texte: string, ok: () => void, libelle = 'Confirmer', destructif = false) {
  Alert.alert(titre, texte, [
    { text: 'Annuler', style: 'cancel' },
    { text: libelle, style: destructif ? 'destructive' : 'default', onPress: ok },
  ]);
}

export function Onglets<T extends string>({ options, valeur, onChange }: { options: [T, string, number?][]; valeur: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
      {options.map(([v, l, n]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[st.onglet, valeur === v && st.ongletActif]}>
          <Text style={[st.ongletTxt, valeur === v && { color: '#fff' }]}>{l}</Text>
          {n ? (
            <View style={[st.compte, valeur === v && { backgroundColor: C.brass }]}>
              <Text style={st.compteTxt}>{n}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Stat({ valeur, libelle, couleur = C.navy, onPress }: { valeur: string | number; libelle: string; couleur?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[st.stat, { borderLeftColor: couleur }]}>
      <Text style={[st.statVal, { color: couleur }]}>{valeur}</Text>
      <Text style={st.statLib}>{libelle}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={C.inkSoft} style={{ position: 'absolute', right: 10, top: 12 }} /> : null}
    </Pressable>
  );
}

export const plus = (n: number, s: string, p = `${s}s`) => `${n} ${n > 1 ? p : s}`;
export const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const contient = (q: string, ...v: (string | null | undefined)[]) => {
  const t = q.trim().toLowerCase();
  return !t || v.some((x) => String(x || '').toLowerCase().includes(t));
};

const st = StyleSheet.create({
  onglet: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.lineStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: C.surface },
  ongletActif: { backgroundColor: C.navy, borderColor: C.navy },
  ongletTxt: { fontWeight: '700', color: C.ink, fontSize: 13.5 },
  compte: { backgroundColor: C.danger, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  compteTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, borderLeftWidth: 5, padding: 12 },
  statVal: { fontSize: 24, fontWeight: '900', fontFamily: 'serif' },
  statLib: { fontSize: 12.5, color: C.inkSoft, fontWeight: '600', marginTop: 2 },
});
