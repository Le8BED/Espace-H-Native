import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MakomMark } from '@/components/MakomLogo';
import { C } from '@/lib/theme';

// Barre d'onglets du bas : Recherche · VEFA · MAKOMSPACE · Menu.
const ONGLETS: Record<string, { label: string; icone: keyof typeof Ionicons.glyphMap; actif: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Recherche', icone: 'search-outline', actif: 'search' },
  vefa: { label: 'VEFA', icone: 'business-outline', actif: 'business' },
  makomspace: { label: 'MAKOMSPACE', icone: 'easel-outline', actif: 'easel' },
  menu: { label: 'Menu', icone: 'menu-outline', actif: 'menu' },
};

function Barre({ state, navigation }: any) {
  const ins = useSafeAreaInsets();
  return (
    <View style={[st.barre, { paddingBottom: Math.max(ins.bottom, 8) }]}>
      {state.routes.map((r: any, i: number) => {
        const o = ONGLETS[r.name];
        if (!o) return null;
        const actif = state.index === i;
        return (
          <Pressable
            key={r.key}
            style={st.onglet}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!actif && !e.defaultPrevented) navigation.navigate(r.name);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
          >
            {r.name === 'makomspace' ? (
              <MakomMark taille={23} couleur={actif ? C.brassLight : 'rgba(255,255,255,0.72)'} id={`makom-onglet-${actif ? 'a' : 'i'}`} />
            ) : (
              <Ionicons name={actif ? o.actif : o.icone} size={24} color={actif ? C.brassLight : 'rgba(255,255,255,0.72)'} />
            )}
            <Text style={[st.label, actif && { color: C.brassLight }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function OngletsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, animation: 'shift' }} tabBar={(p) => <Barre {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="vefa" />
      <Tabs.Screen name="makomspace" />
      <Tabs.Screen name="menu" />
    </Tabs>
  );
}

const st = StyleSheet.create({
  barre: { flexDirection: 'row', backgroundColor: C.navy, borderTopWidth: 2, borderTopColor: C.brass, paddingTop: 8 },
  onglet: { flex: 1, alignItems: 'center', gap: 3 },
  label: { color: 'rgba(255,255,255,0.72)', fontSize: 10.5, fontWeight: '700' },
});
