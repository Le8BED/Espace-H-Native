import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { EXTRANET, SITE } from './theme';

// Accès aux données : site (catalogue public) et extranet (espace client).
// Côté extranet, l'application s'identifie avec un jeton (30 jours) envoyé
// dans l'en-tête « X-Espace-H » ; il est gardé dans le coffre sécurisé du
// téléphone (Keychain / Keystore).

const CLE_JETON = 'espaceh-jeton';
let jeton: string | null = null;

export async function chargerJeton() {
  try {
    jeton = await SecureStore.getItemAsync(CLE_JETON);
  } catch {
    jeton = null;
  }
  return jeton;
}
// Jeton courant (images protégées de l'extranet affichées avec l'en-tête X-Espace-H)
export const jetonActuel = () => jeton;

export async function enregistrerJeton(t: string | null) {
  jeton = t;
  try {
    if (t) await SecureStore.setItemAsync(CLE_JETON, t);
    else await SecureStore.deleteItemAsync(CLE_JETON);
  } catch {
    /* coffre indisponible : le jeton reste en mémoire */
  }
}

export class ApiErreur extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function lireReponse(r: Response) {
  let data: any = null;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  if (!r.ok) {
    const champs = data && data.errors && typeof data.errors === 'object' ? Object.values(data.errors).filter(Boolean).join(' ') : '';
    throw new ApiErreur((data && data.error) || champs || `Erreur ${r.status}`, r.status);
  }
  return data;
}

export async function siteGet<T = any>(chemin: string): Promise<T> {
  const r = await fetch(`${SITE}${chemin}`, { headers: { Accept: 'application/json' } });
  return lireReponse(r);
}

export async function sitePost<T = any>(chemin: string, corps: unknown): Promise<T> {
  const r = await fetch(`${SITE}${chemin}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(corps ?? {}) });
  return lireReponse(r);
}

// Requêtes de l'extranet avec une méthode au choix (PATCH, DELETE…)
export async function extranetRequete<T = any>(methode: string, chemin: string, corps?: unknown): Promise<T> {
  const r = await fetch(`${EXTRANET}${chemin}`, {
    method: methode,
    headers: entetes(corps !== undefined ? { 'Content-Type': 'application/json' } : {}),
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
  });
  return lireReponse(r);
}

const entetes = (extra: Record<string, string> = {}) => ({
  Accept: 'application/json',
  ...(jeton ? { 'X-Espace-H': jeton } : {}),
  ...extra,
});

export async function extranetGet<T = any>(chemin: string): Promise<T> {
  const r = await fetch(`${EXTRANET}${chemin}`, { headers: entetes() });
  return lireReponse(r);
}

export async function extranetPost<T = any>(chemin: string, corps: unknown): Promise<T> {
  const r = await fetch(`${EXTRANET}${chemin}`, {
    method: 'POST',
    headers: entetes({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(corps ?? {}),
  });
  return lireReponse(r);
}

// Envoi d'un formulaire (champs + fichier éventuel), ex. messages du locataire
export async function extranetPostForm<T = any>(chemin: string, fd: FormData): Promise<T> {
  const r = await fetch(`${EXTRANET}${chemin}`, { method: 'POST', headers: entetes(), body: fd });
  return lireReponse(r);
}

// Télécharge un document de l'extranet (PDF, image) puis l'ouvre avec la
// fenêtre « Partager / Ouvrir avec » du téléphone.
export async function ouvrirDocument(chemin: string, nomFichier: string) {
  const r = await expoFetch(`${EXTRANET}${chemin}`, { headers: entetes({ Accept: '*/*' }) });
  if (!r.ok) {
    let msg = `Erreur ${r.status}`;
    try {
      const d = await r.json();
      if (d && d.error) msg = d.error;
    } catch {
      /* pas du JSON */
    }
    throw new ApiErreur(msg, r.status);
  }
  const typeRecu = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' };
  let nom = nomFichier.replace(/[^\w.\- ]+/g, '_') || 'document';
  if (EXT[typeRecu]) nom = `${nom.replace(/\.(pdf|jpe?g|png|heic|webp)$/i, '')}.${EXT[typeRecu]}`;
  const fichier = new File(Paths.cache, nom);
  try {
    if (fichier.exists) fichier.delete();
  } catch {
    /* rien */
  }
  fichier.write(await r.bytes());
  const type = typeRecu || (nom.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fichier.uri, { mimeType: type || undefined, dialogTitle: nom, UTI: type === 'application/pdf' ? 'com.adobe.pdf' : undefined });
  } else {
    throw new ApiErreur('Impossible d’ouvrir le document sur ce téléphone.', 0);
  }
}
