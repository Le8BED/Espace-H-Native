import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ombre } from '@/lib/theme';

// Parcours en étapes, au style des vidéos : barre d'étapes numérotées,
// surtitre en capitales + titre serif (2e ligne colorée), grandes cartes à
// choisir, confirmation animée. Trois ambiances : Agence H (bleu nuit / or),
// PUB (couleurs marketing), MAKOMSPACE (bleu nuit / or MAKOM / crème).
export type ThemeEtapes = 'agence' | 'pub' | 'makom';

export const THEMES: Record<ThemeEtapes, { accent: string; accent2: string; fonce: string; doux: string; texteBouton: string; degrade: [string, string, ...string[]]; fond: string; serif: boolean }> = {
  agence: { accent: '#c9a24b', accent2: '#e3c27f', fonce: '#0a2544', doux: '#f6f1e6', texteBouton: '#0a2544', degrade: ['#0a2544', '#16365e'], fond: '#f4f6f8', serif: true },
  pub: { accent: '#ff5c78', accent2: '#ffd23f', fonce: '#2a0f55', doux: '#fff0f3', texteBouton: '#ffffff', degrade: ['#7c3aed', '#ff5c78', '#ff9f33'], fond: '#fbf7ff', serif: false },
  makom: { accent: '#b8894d', accent2: '#d9b47a', fonce: '#10223a', doux: '#f3ece0', texteBouton: '#10223a', degrade: ['#10223a', '#1f3553'], fond: '#f7f2e9', serif: true },
};

// Apparition (fondu + glissement) à chaque changement de « cle »
export function Apparition({ cle, delai = 0, children, style }: { cle?: string | number; delai?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 380, delay: delai, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [cle, delai, v]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>{children}</Animated.View>;
}

export function BarreEtapes({ etapes, actuelle, theme = 'agence', onAller }: { etapes: string[]; actuelle: number; theme?: ThemeEtapes; onAller?: (i: number) => void }) {
  const t = THEMES[theme];
  const largeur = useRef(new Animated.Value(0)).current;
  const pct = etapes.length > 1 ? actuelle / (etapes.length - 1) : 1;
  useEffect(() => {
    Animated.timing(largeur, { toValue: pct, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, largeur]);
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[st.surtitre, { color: t.accent }]}>
          Étape {actuelle + 1} sur {etapes.length}
        </Text>
        <Text style={st.nomEtape}>{etapes[actuelle]}</Text>
      </View>
      <View style={{ marginTop: 10, height: 36, justifyContent: 'center' }}>
        <View style={[st.rail, { backgroundColor: '#e1e5ea' }]} />
        <Animated.View style={[st.rail, { overflow: 'hidden', width: largeur.interpolate({ inputRange: [0, 1], outputRange: ['0%', '92%'] }) }]}>
          <LinearGradient colors={t.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {etapes.map((e, i) => {
            const fait = i < actuelle;
            const cour = i === actuelle;
            const actif = fait || cour;
            return (
              <Pressable key={e} disabled={!onAller || !fait} onPress={() => onAller && onAller(i)} style={[st.pastille, cour && { transform: [{ scale: 1.12 }] }, !actif && { backgroundColor: '#fff', borderWidth: 2, borderColor: '#dfe3e8' }]}>
                {actif ? <LinearGradient colors={t.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} /> : null}
                {fait ? <Ionicons name="checkmark" size={18} color="#fff" /> : <Text style={{ color: actif ? '#fff' : '#8a93a3', fontWeight: '800' }}>{i + 1}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function EnteteEtape({ surtitre, titre, italique, theme = 'agence', texte, cle }: { surtitre: string; titre: string; italique?: string; theme?: ThemeEtapes; texte?: string; cle?: string | number }) {
  const t = THEMES[theme];
  return (
    <Apparition cle={cle ?? titre} style={{ marginBottom: 16 }}>
      <Text style={[st.surtitre, { color: t.accent }]}>{surtitre}</Text>
      <Text style={[st.titre, t.serif ? { fontFamily: 'serif', fontWeight: '700' } : { fontWeight: '900' }]}>
        {titre}
        {italique ? (
          <Text style={{ color: t.accent, fontStyle: t.serif ? 'italic' : 'normal' }}>
            {'\n'}
            {italique}
          </Text>
        ) : null}
      </Text>
      {texte ? <Text style={st.texte}>{texte}</Text> : null}
    </Apparition>
  );
}

export function CarteChoix({ actif, onPress, titre, texte, icone, theme = 'agence', delai = 0 }: { actif: boolean; onPress: () => void; titre: string; texte?: string; icone?: keyof typeof Ionicons.glyphMap; theme?: ThemeEtapes; delai?: number }) {
  const t = THEMES[theme];
  // MAKOMSPACE : toujours aux couleurs du logo (bleu nuit + or)
  const mk = theme === 'makom';
  const fond: [string, string, ...string[]] | null = mk ? (actif ? ['#d9b47a', '#b8894d', '#9a6d36'] : ['#10223a', '#1a3050']) : actif ? t.degrade : null;
  const cTitre = mk ? (actif ? '#10223a' : '#d9b47a') : actif ? '#fff' : t.fonce;
  const cTexte = mk ? (actif ? 'rgba(16,34,58,0.78)' : '#cfc6b6') : actif ? 'rgba(255,255,255,0.82)' : '#57616f';
  const cIcone = mk ? (actif ? '#10223a' : '#d9b47a') : actif ? '#fff' : t.accent;
  return (
    <Apparition delai={delai}>
      <Pressable onPress={onPress} style={({ pressed }) => [st.carte, { borderColor: mk ? (actif ? '#d9b47a' : 'rgba(184,137,77,0.45)') : actif ? t.accent : '#e3e6ea' }, pressed && { transform: [{ scale: 0.985 }] }]}>
        {fond ? <LinearGradient colors={fond} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} /> : null}
        {icone ? (
          <View style={[st.icone, { backgroundColor: mk ? (actif ? 'rgba(16,34,58,0.12)' : 'rgba(217,180,122,0.14)') : actif ? 'rgba(255,255,255,0.18)' : t.doux }]}>
            <Ionicons name={icone} size={22} color={cIcone} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[st.carteTitre, { color: cTitre }]}>{titre}</Text>
          {texte ? <Text style={[st.carteTexte, { color: cTexte }]}>{texte}</Text> : null}
        </View>
        {actif ? <Ionicons name="checkmark-circle" size={22} color={cIcone} /> : null}
      </Pressable>
    </Apparition>
  );
}

export function BoutonsEtape({ precedent, suivant, libelle = 'Continuer', desactive, enCours, theme = 'agence' }: { precedent?: () => void; suivant?: () => void; libelle?: string; desactive?: boolean; enCours?: boolean; theme?: ThemeEtapes }) {
  const t = THEMES[theme];
  const off = desactive || enCours;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 10 }}>
      {precedent ? (
        <Pressable onPress={precedent} style={st.precedent}>
          <Text style={{ color: '#131c28', fontWeight: '700' }}>‹ Précédent</Text>
        </Pressable>
      ) : (
        <View />
      )}
      {suivant ? (
        <Pressable onPress={off ? undefined : suivant} style={({ pressed }) => [st.suivant, { opacity: off ? 0.45 : pressed ? 0.85 : 1, backgroundColor: theme === 'pub' ? undefined : t.accent }]}>
          {theme === 'pub' ? <LinearGradient colors={t.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} /> : null}
          <Text style={{ color: t.texteBouton, fontWeight: '800', fontSize: 15.5 }}>{enCours ? 'Envoi…' : `${libelle} ›`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Confirmation({ titre, theme = 'agence', children }: { titre: string; theme?: ThemeEtapes; children?: ReactNode }) {
  const t = THEMES[theme];
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [pop]);
  return (
    <Apparition style={[st.confirmation, ombre]}>
      <LinearGradient colors={t.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
      <Animated.View style={[st.rond, { transform: [{ scale: pop }] }]}>
        <Ionicons name="checkmark" size={46} color="#fff" />
      </Animated.View>
      <Text style={[st.confTitre, { fontFamily: t.serif ? 'serif' : undefined }]}>{titre}</Text>
      {children ? <View style={{ marginTop: 10, alignSelf: 'stretch' }}>{children}</View> : null}
    </Apparition>
  );
}

// Bandeau d'en-tête coloré (haut de parcours)
export function Bandeau({ theme = 'agence', surtitre, titre, italique, texte }: { theme?: ThemeEtapes; surtitre: string; titre: string; italique?: string; texte?: string }) {
  const t = THEMES[theme];
  return (
    <View style={[st.bandeau, ombre]}>
      <LinearGradient colors={t.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
      <Text style={[st.surtitre, { color: t.accent2 }]}>{surtitre}</Text>
      <Text style={[st.bandeauTitre, t.serif ? { fontFamily: 'serif', fontWeight: '700' } : { fontWeight: '900' }]}>
        {titre}
        {italique ? <Text style={{ color: t.accent2, fontStyle: t.serif ? 'italic' : 'normal' }}>{`\n${italique}`}</Text> : null}
      </Text>
      {texte ? <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 14.5, lineHeight: 20 }}>{texte}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  surtitre: { fontSize: 11.5, fontWeight: '800', letterSpacing: 2.4, textTransform: 'uppercase' },
  nomEtape: { fontSize: 12.5, color: '#57616f', fontWeight: '600' },
  rail: { position: 'absolute', left: 18, right: 18, height: 4, borderRadius: 2 },
  pastille: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  titre: { fontSize: 27, lineHeight: 33, color: '#131c28', marginTop: 6 },
  texte: { marginTop: 8, color: '#57616f', fontSize: 14.5, lineHeight: 20 },
  carte: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 18, padding: 14, marginBottom: 10, backgroundColor: '#fff', overflow: 'hidden' },
  icone: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  carteTitre: { fontSize: 16, fontWeight: '800' },
  carteTexte: { fontSize: 13.5, marginTop: 3, lineHeight: 18 },
  precedent: { borderWidth: 1.5, borderColor: '#c7cdd6', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
  suivant: { borderRadius: 999, paddingHorizontal: 24, paddingVertical: 14, overflow: 'hidden', alignItems: 'center', flexShrink: 1 },
  confirmation: { borderRadius: 26, padding: 26, alignItems: 'center', overflow: 'hidden', marginVertical: 8 },
  rond: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  confTitre: { color: '#fff', fontSize: 25, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  bandeau: { borderRadius: 24, padding: 20, marginBottom: 18, overflow: 'hidden' },
  bandeauTitre: { color: '#fff', fontSize: 30, lineHeight: 36, marginTop: 8 },
});
