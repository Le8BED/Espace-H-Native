import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, ombre } from '@/lib/theme';

// Briques d'interface communes (couleurs du site : bleu marine et doré).

export function Ecran({
  children,
  scroll = true,
  fond = C.ground,
  basExtra = 90,
  onRefresh,
  refreshing = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  fond?: string;
  basExtra?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ins = useSafeAreaInsets();
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: fond, paddingTop: ins.top }, style]}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: fond }}
      contentContainerStyle={[{ paddingTop: ins.top + 8, paddingBottom: ins.bottom + basExtra, paddingHorizontal: 18 }, style]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brass} colors={[C.brass]} /> : undefined}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Titre({ children, sous, style }: { children: ReactNode; sous?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 6, marginBottom: 14 }, style]}>
      <Text style={s.titre}>{children}</Text>
      <View style={s.trait} />
      {sous ? <Text style={s.sousTitre}>{sous}</Text> : null}
    </View>
  );
}

export function SousTitre({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}

export function Carte({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.carte, pressed && { transform: [{ scale: 0.985 }] }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[s.carte, style]}>{children}</View>;
}

export function Bouton({
  titre,
  onPress,
  variante = 'or',
  icone,
  desactive,
  style,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'or' | 'marine' | 'contour' | 'clair' | 'danger';
  icone?: ReactNode;
  desactive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fond = variante === 'or' ? C.brass : variante === 'marine' ? C.navy : variante === 'danger' ? C.dangerBg : 'transparent';
  // « clair » : bouton à contour blanc, pour les fonds bleu marine
  const couleur = variante === 'or' ? C.navy : variante === 'marine' || variante === 'clair' ? '#fff' : variante === 'danger' ? C.danger : C.ink;
  return (
    <Pressable
      onPress={desactive ? undefined : onPress}
      style={({ pressed }) => [
        s.bouton,
        { backgroundColor: fond, borderWidth: variante === 'contour' || variante === 'clair' ? 1.5 : 0, borderColor: variante === 'clair' ? 'rgba(255,255,255,0.6)' : C.lineStrong, opacity: desactive ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {icone}
      <Text style={[s.boutonTexte, { color: couleur }]}>{titre}</Text>
    </Pressable>
  );
}

export function Badge({ texte, couleur = C.navy, fond = '#e3edf8' }: { texte: string; couleur?: string; fond?: string }) {
  return (
    <View style={[s.badge, { backgroundColor: fond }]}>
      <Text style={[s.badgeTexte, { color: couleur }]}>{texte}</Text>
    </View>
  );
}

export function Ligne({ libelle, valeur, gras }: { libelle: string; valeur?: ReactNode; gras?: boolean }) {
  return (
    <View style={s.ligne}>
      <Text style={s.ligneLib}>{libelle}</Text>
      {typeof valeur === 'string' || typeof valeur === 'number' ? <Text style={[s.ligneVal, gras && { fontWeight: '800' }]}>{valeur || '—'}</Text> : valeur}
    </View>
  );
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={C.brass} size="large" />
      <Text style={{ color: C.inkSoft }}>{texte}</Text>
    </View>
  );
}

export function Message({ texte, type = 'info', action, onAction }: { texte: string; type?: 'info' | 'erreur' | 'ok'; action?: string; onAction?: () => void }) {
  const fond = type === 'erreur' ? C.dangerBg : type === 'ok' ? C.okBg : '#eef3fa';
  const couleur = type === 'erreur' ? C.danger : type === 'ok' ? C.ok : C.navy2;
  return (
    <View style={{ backgroundColor: fond, borderRadius: 14, padding: 14, marginVertical: 8 }}>
      <Text style={{ color: couleur, fontSize: 14.5, lineHeight: 20 }}>{texte}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={{ marginTop: 8 }}>
          <Text style={{ color: couleur, fontWeight: '700', textDecorationLine: 'underline' }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Vide({ texte }: { texte: string }) {
  return <Text style={{ color: C.inkSoft, textAlign: 'center', paddingVertical: 24 }}>{texte}</Text>;
}

export const s = StyleSheet.create({
  titre: { fontSize: 32, fontWeight: '800', color: C.ink, fontFamily: 'serif' },
  trait: { width: 46, height: 3, backgroundColor: C.brass, marginTop: 6, borderRadius: 2 },
  sousTitre: { marginTop: 8, color: C.inkSoft, fontSize: 15, lineHeight: 21 },
  h2: { fontSize: 21, fontWeight: '800', color: C.ink, marginTop: 22, marginBottom: 10, fontFamily: 'serif' },
  carte: { backgroundColor: C.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: C.line, marginBottom: 12, ...ombre },
  bouton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 22 },
  boutonTexte: { fontSize: 15.5, fontWeight: '800' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTexte: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 10 },
  ligneLib: { color: C.inkSoft, fontSize: 14.5, flexShrink: 1 },
  ligneVal: { color: C.ink, fontSize: 14.5, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  texte: { color: C.ink, fontSize: 15, lineHeight: 22 },
  petit: { color: C.inkSoft, fontSize: 13, lineHeight: 18 },
  lib: { fontSize: 13, fontWeight: '700', color: C.inkSoft, marginBottom: 6 },
});
