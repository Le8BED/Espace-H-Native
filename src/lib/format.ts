export const eur = (n: number | null | undefined) =>
  `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

export const eur2 = (n: number | null | undefined) =>
  `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export function dateFr(v?: string | null) {
  if (!v) return '';
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function initiales(nom?: string) {
  return (
    String(nom || '')
      .trim()
      .split(/[\s-]+/)
      .filter((m) => m && !/^(m|mme|mr|dr|sci|sas|sarl)\.?$/i.test(m))
      .slice(0, 2)
      .map((m) => m[0].toUpperCase())
      .join('') || '?'
  );
}
