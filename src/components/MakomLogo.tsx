import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

// Logo MAKOMSPACE (même dessin que sur le site) : le « M » et sa porte dorée.
export function MakomMark({ taille = 24, couleur = '#f1ece2', id = 'makom-or' }: { taille?: number; couleur?: string; id?: string }) {
  return (
    <Svg width={(taille * 404) / 362} height={taille} viewBox="0 0 404 362">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor="#d9b47a" />
          <Stop offset="1" stopColor="#9a6d36" />
        </LinearGradient>
      </Defs>
      <Polygon points="0,0 245,140 190,172 60,97 60,352 0,352" fill={couleur} />
      <Polygon points="403,0 403,352 343,352 343,97 258,136 236,96" fill={couleur} />
      <Polygon points="218,184 288,150 288,359 218,332" fill={`url(#${id})`} />
    </Svg>
  );
}
