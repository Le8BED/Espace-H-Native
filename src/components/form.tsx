import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/theme';

// Kit de formulaires : champ texte, choix (puces), feuille modale, recherche.

export function Champ({
  label,
  valeur,
  onChange,
  placeholder,
  clavier,
  multiligne,
  secret,
  aide,
  autoCap = 'sentences',
}: {
  label: string;
  valeur: string;
  onChange: (t: string) => void;
  placeholder?: string;
  clavier?: KeyboardTypeOptions;
  multiligne?: boolean;
  secret?: boolean;
  aide?: string;
  autoCap?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={f.lib}>{label}</Text>
      <TextInput
        value={valeur}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9aa3ae"
        keyboardType={clavier}
        multiline={multiligne}
        secureTextEntry={secret}
        autoCapitalize={autoCap}
        style={[f.champ, multiligne && { minHeight: 96, textAlignVertical: 'top' }]}
      />
      {aide ? <Text style={f.aide}>{aide}</Text> : null}
    </View>
  );
}

export function Choix<T extends string>({ label, options, valeur, onChange, defiler }: { label?: string; options: [T, string][]; valeur: T; onChange: (v: T) => void; defiler?: boolean }) {
  const contenu = options.map(([v, l]) => (
    <Pressable key={v || 'vide'} onPress={() => onChange(v)} style={[f.puce, valeur === v && f.puceActive]}>
      <Text style={[f.puceTxt, valeur === v && { color: '#fff' }]}>{l}</Text>
    </Pressable>
  ));
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={f.lib}>{label}</Text> : null}
      {defiler ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {contenu}
        </ScrollView>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{contenu}</View>
      )}
    </View>
  );
}

export function Feuille({ visible, titre, onFermer, children, pied }: { visible: boolean; titre: string; onFermer: () => void; children: ReactNode; pied?: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onFermer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.ground }}>
        <View style={[f.feuilleHaut, { paddingTop: Platform.OS === 'android' ? ins.top + 10 : 14 }]}>
          <Text style={f.feuilleTitre} numberOfLines={1}>
            {titre}
          </Text>
          <Pressable onPress={onFermer} hitSlop={12} accessibilityLabel="Fermer">
            <Ionicons name="close-circle" size={30} color={C.inkSoft} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {pied ? <View style={[f.pied, { paddingBottom: Math.max(ins.bottom, 12) }]}>{pied}</View> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function BarreRecherche({ valeur, onChange, placeholder = 'Rechercher…' }: { valeur: string; onChange: (t: string) => void; placeholder?: string }) {
  return (
    <View style={f.recherche}>
      <Ionicons name="search" size={18} color={C.inkSoft} />
      <TextInput value={valeur} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9aa3ae" style={{ flex: 1, fontSize: 15, color: C.ink, paddingVertical: 10 }} autoCorrect={false} />
      {valeur ? (
        <Pressable onPress={() => onChange('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={C.inkSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function LigneAction({ icone, titre, sous, onPress, droite }: { icone: keyof typeof Ionicons.glyphMap; titre: string; sous?: string; onPress?: () => void; droite?: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [f.ligne, pressed && onPress && { backgroundColor: '#f1f3f6' }]}>
      <View style={f.ligneIcone}>
        <Ionicons name={icone} size={20} color={C.brass} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={f.ligneTitre} numberOfLines={2}>
          {titre}
        </Text>
        {sous ? (
          <Text style={f.ligneSous} numberOfLines={3}>
            {sous}
          </Text>
        ) : null}
      </View>
      {droite ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={C.inkSoft} /> : null)}
    </Pressable>
  );
}

export const f = StyleSheet.create({
  lib: { fontSize: 13, fontWeight: '700', color: C.inkSoft, marginBottom: 6 },
  champ: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, fontSize: 15.5, color: C.ink, backgroundColor: C.surface },
  aide: { fontSize: 12, color: C.inkSoft, marginTop: 4 },
  puce: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, marginRight: 6, marginBottom: 2, backgroundColor: C.surface },
  puceActive: { backgroundColor: C.navy, borderColor: C.navy },
  puceTxt: { fontWeight: '700', color: C.ink, fontSize: 13.5 },
  feuilleHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.surface },
  feuilleTitre: { fontSize: 19, fontWeight: '800', color: C.ink, flex: 1, marginRight: 10 },
  pied: { padding: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', gap: 10 },
  recherche: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, marginBottom: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  ligneIcone: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fbf6ea', alignItems: 'center', justifyContent: 'center' },
  ligneTitre: { fontSize: 15, fontWeight: '700', color: C.ink },
  ligneSous: { fontSize: 13, color: C.inkSoft, marginTop: 2 },
});
