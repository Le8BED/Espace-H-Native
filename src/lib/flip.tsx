import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { C } from './theme';

// « L'application se retourne » : animation 3D quand on entre dans l'espace
// client ou qu'on en sort. basculer(action) : l'écran pivote jusqu'au profil,
// l'action (navigation) a lieu, puis l'écran finit de pivoter de l'autre côté.

type Ctx = { basculer: (action: () => void) => void };
const FlipCtx = createContext<Ctx>({ basculer: (a) => a() });

export function FlipProvider({ children }: { children: ReactNode }) {
  const angle = useRef(new Animated.Value(0)).current;
  const enCours = useRef(false);

  const basculer = useCallback(
    (action: () => void) => {
      if (enCours.current) return;
      enCours.current = true;
      Animated.timing(angle, { toValue: 1, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
        action();
        angle.setValue(-1);
        setTimeout(() => {
          Animated.timing(angle, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
            enCours.current = false;
          });
        }, 60);
      });
    },
    [angle]
  );

  const rotateY = angle.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] });
  const scale = angle.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.9, 1, 0.9] });
  const opacity = angle.interpolate({ inputRange: [-1, -0.6, 0, 0.6, 1], outputRange: [0.2, 0.85, 1, 0.85, 0.2] });

  return (
    <FlipCtx.Provider value={{ basculer }}>
      <View style={styles.fond}>
        <Animated.View style={[styles.plein, { opacity, transform: [{ perspective: 1200 }, { rotateY }, { scale }] }]}>{children}</Animated.View>
      </View>
    </FlipCtx.Provider>
  );
}

export const useFlip = () => useContext(FlipCtx);

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: C.navy },
  plein: { flex: 1, backgroundColor: C.ground },
});
