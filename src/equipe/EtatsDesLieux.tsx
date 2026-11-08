import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, PanResponder, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BarreEtapes, BoutonsEtape, CarteChoix, EnteteEtape } from '@/components/etapes';
import { BarreRecherche, Champ, Choix, f } from '@/components/form';
import { Badge, Bouton, Carte, Chargement, Ecran, Message, s, Titre, Vide } from '@/components/ui';
import { extranetGet, extranetPost, extranetRequete, jetonActuel, ouvrirDocument } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateFr } from '@/lib/format';
import { C, EXTRANET } from '@/lib/theme';

// v193 : état des lieux sur tablette, en étapes :
// 1 type (entrée / sortie) et date — pour une sortie, l'état d'entrée est repris ;
// 2 informations générales ; 3 clés (photo + nombre) ; 4 entrée / couloir ;
// 5 séjour ; 6 cuisine ; 7 chambres (autant que voulu) puis salle de bain ;
// toilettes séparées (WC suspendu ou posé) ; 8 observations ; signature à
// l'écran (« lu et approuvé »). Chaque étape est enregistrée sur l'extranet ;
// le PDF est créé à la signature.

type Etat = string;
type Element = { nom: string; entree: Etat; sortie: Etat; obs: string };
type Piece = { id: string; type: string; nom: string; photos: string[]; elements: Element[]; obs: string; wcSuspendu?: boolean; wcInclus?: boolean };
type Donnees = {
  type: 'entree' | 'sortie';
  date: string;
  entreeId: number | null;
  logement: { adresse: string; typeLogement: string; etage: string; porte: string; meuble: string };
  locataire: { nom: string; email: string; tel: string; tenantAccountId: string | null; crmId: number | null };
  colocationId: string;
  typeBail: 'individuel' | 'solidaire' | 'na';
  cles: Record<string, any>;
  clesEntree?: Record<string, any> | null;
  pieces: Piece[];
  observations: string;
};
type Personne = { id: string | number; nom: string; email: string; telephone?: string; adresse?: string };

const ETATS_DEFAUT = ['Neuf', 'Bon état', 'État d’usage', 'Mauvais état', 'Hors service', 'Non applicable'];
const BASE = ['Murs', 'Plafond', 'Sol', 'Porte(s)', 'Fenêtre / volet', 'Prises et interrupteurs', 'Éclairage', 'Chauffage / radiateur'];
const ELEMENTS_DEFAUT: Record<string, string[]> = {
  couloir: [...BASE, 'Interphone / digicode'],
  sejour: [...BASE, 'Placard / rangement'],
  cuisine: [...BASE, 'Évier et robinetterie', 'Plan de travail', 'Crédence / faïence', 'Meubles hauts et bas', 'Plaques de cuisson', 'Four / micro-ondes', 'Hotte', 'Réfrigérateur', 'Lave-vaisselle (ou emplacement)', 'VMC / aération'],
  chambre: [...BASE, 'Placard / rangement'],
  sdb: ['Murs', 'Plafond', 'Sol', 'Porte(s)', 'Fenêtre / volet', 'Prises et interrupteurs', 'Éclairage', 'Chauffage / sèche-serviettes', 'Baignoire / douche', 'Paroi / rideau de douche', 'Lavabo / vasque', 'Robinetterie', 'Miroir / meuble', 'Faïence / joints', 'VMC / aération', 'Lave-linge (ou emplacement)'],
  wc: ['Murs', 'Plafond', 'Sol', 'Porte', 'Éclairage', 'Cuvette et abattant', 'Chasse d’eau / mécanisme', 'Bâti-support (WC suspendu)', 'Lave-mains', 'VMC / aération'],
};
const WC_SDB = ['WC : cuvette et abattant', 'WC : chasse d’eau / mécanisme'];
const WC_BATI = 'WC : bâti-support (WC suspendu)';

// Recherche d'adresse (Base Adresse Nationale)
async function chercherAdresses(q: string): Promise<string[]> {
  const urls = [`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`, `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const d = await r.json();
      const l: string[] = (d.features || []).map((f: any) => f.properties && f.properties.label).filter(Boolean);
      if (l.length) return l;
    } catch {
      /* essai suivant */
    }
  }
  return [];
}

function AdresseAuto({ valeur, onChange }: { valeur: string; onChange: (t: string) => void }) {
  const [sugg, setSugg] = useState<string[]>([]);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taper = (v: string) => {
    onChange(v);
    if (minuteur.current) clearTimeout(minuteur.current);
    if (v.trim().length < 4) {
      setSugg([]);
      return;
    }
    minuteur.current = setTimeout(async () => setSugg(await chercherAdresses(v.trim())), 300);
  };
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={f.lib}>Adresse du logement</Text>
      <TextInput value={valeur} onChangeText={taper} placeholder="Tapez l’adresse puis choisissez-la" placeholderTextColor="#9aa3ae" style={f.champ} autoCorrect={false} />
      {sugg.length ? (
        <View style={{ borderWidth: 1, borderColor: C.lineStrong, borderRadius: 12, marginTop: 4, backgroundColor: '#fff', overflow: 'hidden' }}>
          {sugg.map((a) => (
            <Pressable
              key={a}
              onPress={() => {
                onChange(a);
                setSugg([]);
              }}
              style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.line }}
            >
              <Text style={{ color: C.ink, fontSize: 15 }}>📍 {a}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const NOMS: Record<string, string> = { couloir: 'Entrée / couloir', sejour: 'Salon / séjour / pièce à vivre', cuisine: 'Cuisine', chambre: 'Chambre', sdb: 'Salle de bain', wc: 'Toilettes' };
const CLES: [string, string][] = [
  ['logement', 'Clés du logement'],
  ['boiteLettres', 'Clés de boîte aux lettres'],
  ['badge', 'Badges / télécommandes'],
  ['cave', 'Clés de cave'],
  ['parking', 'Clés / bips de parking'],
  ['autre', 'Autre'],
];
const TYPES_LOGEMENT: [string, string][] = [['Studio', 'Studio'], ['T1', 'T1'], ['T2', 'T2'], ['T3', 'T3'], ['T4', 'T4'], ['T5 et +', 'T5 et +'], ['Maison', 'Maison'], ['Chambre', 'Chambre']];
const PORTES: [string, string][] = [['Gauche', 'Gauche'], ['Droite', 'Droite'], ['Face', 'Face'], ['Seule sur le palier', 'Seule sur le palier']];

const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const uid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nouvellePiece = (type: string, nom?: string): Piece => ({ id: uid(), type, nom: nom || NOMS[type], photos: [], elements: (ELEMENTS_DEFAUT[type] || []).map((n) => ({ nom: n, entree: '', sortie: '', obs: '' })), obs: '', wcSuspendu: type === 'wc' ? false : undefined });
const vide = (): Donnees => ({
  type: 'entree',
  date: aujourdhui(),
  entreeId: null,
  logement: { adresse: '', typeLogement: '', etage: '', porte: '', meuble: '' },
  locataire: { nom: '', email: '', tel: '', tenantAccountId: null, crmId: null },
  colocationId: '',
  typeBail: 'na',
  cles: { photos: [], logement: 0, boiteLettres: 0, badge: 0, cave: 0, parking: 0, autre: 0, autreLibelle: '' },
  pieces: [nouvellePiece('couloir'), nouvellePiece('sejour'), nouvellePiece('cuisine'), nouvellePiece('chambre', 'Chambre 1')],
  observations: '',
});

// ---------- Photo protégée de l'extranet ----------
function Vignette({ edlId, fichier, onSuppr }: { edlId: number; fichier: string; onSuppr?: () => void }) {
  const jeton = jetonActuel();
  return (
    <View style={{ marginRight: 8, marginBottom: 8 }}>
      <Image source={{ uri: `${EXTRANET}/api/edl/${edlId}/photo?f=${fichier}`, headers: jeton ? { 'X-Espace-H': jeton } : undefined }} style={{ width: 110, height: 82, borderRadius: 10, backgroundColor: C.line }} contentFit="cover" />
      {onSuppr ? (
        <Pressable onPress={onSuppr} hitSlop={8} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999 }}>
          <Ionicons name="close" size={16} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function Photos({ edlId, liste, onChange, libelle }: { edlId: number; liste: string[]; onChange: (l: string[]) => void; libelle: string }) {
  const [busy, setBusy] = useState(false);
  const prendre = async (camera: boolean) => {
    try {
      if (camera) {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
          Alert.alert('Appareil photo', 'Autorisez l’appareil photo dans les réglages pour prendre les photos.');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.45, base64: true, exif: false };
      const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: false });
      if (r.canceled || !r.assets[0] || !r.assets[0].base64) return;
      setBusy(true);
      const a = r.assets[0];
      const d = await extranetPost<{ fichier: string }>(`/api/edl/${edlId}/photo`, { base64: a.base64, mime: a.mimeType === 'image/png' ? 'image/png' : 'image/jpeg' });
      onChange([...liste, d.fichier].slice(0, 6));
    } catch (e: any) {
      Alert.alert('Photo non enregistrée', e.message || 'Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={f.lib}>{libelle}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {liste.map((x) => (
          <Vignette key={x} edlId={edlId} fichier={x} onSuppr={() => onChange(liste.filter((y) => y !== x))} />
        ))}
      </View>
      {liste.length < 6 ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Bouton titre={busy ? 'Envoi…' : 'Prendre une photo'} variante="marine" desactive={busy} onPress={() => prendre(true)} icone={<Ionicons name="camera" size={18} color="#fff" />} style={{ flex: 1 }} />
          <Bouton titre="Galerie" variante="contour" desactive={busy} onPress={() => prendre(false)} />
        </View>
      ) : null}
    </View>
  );
}

// ---------- Compteur de clés ----------
function Compteur({ libelle, valeur, onChange, avant }: { libelle: string; valeur: number; onChange: (n: number) => void; avant?: number | null }) {
  return (
    <View style={[s.ligne, { paddingVertical: 8 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.ligneLib}>{libelle}</Text>
        {avant != null ? <Text style={s.petit}>Remis à l’entrée : {avant}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => onChange(Math.max(0, valeur - 1))} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="remove" size={20} color={C.ink} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', minWidth: 26, textAlign: 'center', color: C.ink }}>{valeur}</Text>
        <Pressable onPress={() => onChange(Math.min(99, valeur + 1))} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

// ---------- Élément d'une pièce ----------
function LigneElement({ el, sortie, etats, onChange }: { el: Element; sortie: boolean; etats: string[]; onChange: (e: Element) => void }) {
  const [obsOuverte, setObsOuverte] = useState(!!el.obs);
  const cle = sortie ? 'sortie' : 'entree';
  return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 15.5, fontWeight: '800', color: C.ink, flex: 1 }}>{el.nom}</Text>
        {sortie ? <Badge texte={`Entrée : ${el.entree || '—'}`} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {etats.map((e) => {
          const actif = el[cle] === e;
          const mauvais = /Mauvais|Hors service/.test(e);
          return (
            <Pressable key={e} onPress={() => onChange({ ...el, [cle]: actif ? '' : e })} style={[f.puce, { paddingVertical: 9 }, actif && { backgroundColor: mauvais ? C.danger : C.navy, borderColor: mauvais ? C.danger : C.navy }]}>
              <Text style={[f.puceTxt, actif && { color: '#fff' }]}>{e}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setObsOuverte((v) => !v)} style={[f.puce, { paddingVertical: 9, borderStyle: 'dashed' }]}>
          <Text style={f.puceTxt}>{obsOuverte ? '− Observation' : '+ Observation'}</Text>
        </Pressable>
      </View>
      {obsOuverte ? (
        <TextInput value={el.obs} onChangeText={(t) => onChange({ ...el, obs: t })} placeholder="Ex. : trou de cheville à gauche de la porte, rayure 10 cm…" placeholderTextColor="#9aa3ae" multiline style={[f.champ, { marginTop: 8, minHeight: 60, textAlignVertical: 'top' }]} />
      ) : null}
    </View>
  );
}

// ---------- Signature à l'écran ----------
function PadSignature({ titre, nom, onNom, valeur, onChange }: { titre: string; nom: string; onNom: (t: string) => void; valeur: { traits: string[]; largeur: number; hauteur: number }; onChange: (v: { traits: string[]; largeur: number; hauteur: number }) => void }) {
  const [taille, setTaille] = useState({ l: 600, h: 220 });
  const courant = useRef<string>('');
  const [enCours, setEnCours] = useState('');
  const traitsRef = useRef<string[]>(valeur.traits);
  traitsRef.current = valeur.traits;
  const tailleRef = useRef(taille);
  tailleRef.current = taille;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          courant.current = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
          setEnCours(courant.current);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          courant.current += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
          setEnCours(courant.current);
        },
        onPanResponderRelease: () => {
          let t = courant.current;
          if (t && !t.includes('L')) t += ` L ${t.split(' ')[1]} ${(Number(t.split(' ')[2]) + 0.5).toFixed(1)}`; // simple point
          if (t) onChange({ traits: [...traitsRef.current, t], largeur: tailleRef.current.l, hauteur: tailleRef.current.h });
          courant.current = '';
          setEnCours('');
        },
      }),
    [onChange]
  );
  return (
    <View style={{ marginBottom: 16 }}>
      <Champ label={titre} valeur={nom} onChange={onNom} placeholder="Nom et prénom" autoCap="words" />
      <View
        onLayout={(e) => setTaille({ l: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
        style={{ height: 200, borderRadius: 16, borderWidth: 1.5, borderColor: C.lineStrong, backgroundColor: '#fff', overflow: 'hidden' }}
        {...pan.panHandlers}
      >
        <Svg width="100%" height="100%">
          {valeur.traits.map((t, i) => (
            <Path key={i} d={t} stroke={C.navy} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {enCours ? <Path d={enCours} stroke={C.navy} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        </Svg>
        {!valeur.traits.length && !enCours ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 86, alignItems: 'center' }}>
            <Text style={{ color: '#b5bcc6', fontSize: 15 }}>Signez ici avec le doigt</Text>
          </View>
        ) : null}
      </View>
      <Pressable onPress={() => onChange({ traits: [], largeur: taille.l, hauteur: taille.h })} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
        <Text style={{ color: C.navy2, fontWeight: '700' }}>Effacer la signature</Text>
      </Pressable>
    </View>
  );
}

// ---------- Choix d'une personne (locataires de l'agence, candidats) ----------
function ChoixPersonne({ personnes, onChoisir }: { personnes: { locataires: Personne[]; candidats: Personne[] } | null; onChoisir: (p: Personne, sorte: 'locataire' | 'candidat') => void }) {
  const [q, setQ] = useState('');
  if (!personnes) return <Chargement />;
  const n = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtre = (l: Personne[]) => (q ? l.filter((p) => n(`${p.nom} ${p.email} ${p.adresse || ''}`).includes(n(q))) : l).slice(0, 25);
  return (
    <View>
      <BarreRecherche valeur={q} onChange={setQ} placeholder="Nom, email, adresse…" />
      <Text style={s.lib}>Locataires de l’agence</Text>
      {filtre(personnes.locataires).map((p) => (
        <Pressable key={`l${p.id}`} onPress={() => onChoisir(p, 'locataire')} style={f.ligne}>
          <Ionicons name="person" size={20} color={C.navy} />
          <View style={{ flex: 1 }}>
            <Text style={f.ligneTitre}>{p.nom}</Text>
            <Text style={f.ligneSous}>{[p.adresse, p.email].filter(Boolean).join(' · ')}</Text>
          </View>
        </Pressable>
      ))}
      <Text style={[s.lib, { marginTop: 14 }]}>Locataires en recherche (fichier clients)</Text>
      {filtre(personnes.candidats).map((p) => (
        <Pressable key={`c${p.id}`} onPress={() => onChoisir(p, 'candidat')} style={f.ligne}>
          <Ionicons name="search" size={20} color={C.brass} />
          <View style={{ flex: 1 }}>
            <Text style={f.ligneTitre}>{p.nom}</Text>
            <Text style={f.ligneSous}>{[p.email, p.telephone].filter(Boolean).join(' · ')}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ---------- Envoi du PDF signé au locataire ----------
function EnvoiMail({ edlId, emailDefaut }: { edlId: number; emailDefaut: string }) {
  const [email, setEmail] = useState(emailDefaut || '');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  return (
    <Carte>
      <Champ label="Envoyer le PDF au locataire" valeur={email} onChange={setEmail} clavier="email-address" autoCap="none" placeholder="email du locataire" />
      <Bouton
        titre={busy ? 'Envoi…' : '✉ Envoyer par email'}
        variante="marine"
        desactive={busy}
        onPress={async () => {
          setBusy(true);
          setOk('');
          try {
            await extranetPost(`/api/edl/${edlId}/envoyer`, { email });
            setOk(`Envoyé à ${email}`);
          } catch (e: any) {
            Alert.alert('Envoi', e.message || 'Envoi impossible.');
          } finally {
            setBusy(false);
          }
        }}
      />
      {ok ? <Message type="ok" texte={`✓ ${ok}`} /> : null}
    </Carte>
  );
}

// ---------- Assistant ----------
function Assistant({ depart, onFermer }: { depart: { id: number; donnees: Donnees } | null; onFermer: (rafraichir?: boolean) => void }) {
  const { user } = useAuth();
  const [id, setId] = useState<number | null>(depart ? depart.id : null);
  const [d, setD] = useState<Donnees>(depart ? { ...vide(), ...depart.donnees } : vide());
  const [etape, setEtape] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [personnes, setPersonnes] = useState<{ locataires: Personne[]; candidats: Personne[] } | null>(null);
  const [etats, setEtats] = useState<string[]>(ETATS_DEFAUT);
  const [choixPersonne, setChoixPersonne] = useState(false);
  const [entrees, setEntrees] = useState<any[] | null>(null);
  const [sigLoc, setSigLoc] = useState({ traits: [] as string[], largeur: 600, hauteur: 200 });
  const [sigAg, setSigAg] = useState({ traits: [] as string[], largeur: 600, hauteur: 200 });
  const [nomLoc, setNomLoc] = useState('');
  const [nomAg, setNomAg] = useState(String(user?.name || ''));
  const [lu, setLu] = useState(false);
  const [fini, setFini] = useState<number | null>(null);

  useEffect(() => {
    extranetGet('/api/edl/personnes')
      .then((r) => {
        setPersonnes({ locataires: r.locataires || [], candidats: r.candidats || [] });
        if (r.catalogue && Array.isArray(r.catalogue.etats)) setEtats(r.catalogue.etats);
      })
      .catch(() => setPersonnes({ locataires: [], candidats: [] }));
  }, []);

  const sortie = d.type === 'sortie';
  // Étapes : type, infos, clés, chaque pièce, observations, signature
  const ecrans = useMemo(() => ['type', 'infos', 'cles', ...d.pieces.map((p) => `piece:${p.id}`), 'obs', 'signature'], [d.pieces]);
  const cle = ecrans[Math.min(etape, ecrans.length - 1)];
  const pieceCourante = cle.startsWith('piece:') ? d.pieces.find((p) => `piece:${p.id}` === cle) || null : null;
  const indexPiece = pieceCourante ? d.pieces.indexOf(pieceCourante) : -1;
  const dernierePiece = pieceCourante && indexPiece === d.pieces.length - 1;
  const libellesBarre = ['Type', 'Infos', 'Clés', 'Pièces', 'Observations', 'Signature'];
  const posBarre = cle === 'type' ? 0 : cle === 'infos' ? 1 : cle === 'cles' ? 2 : pieceCourante ? 3 : cle === 'obs' ? 4 : 5;

  const maj = (patch: Partial<Donnees>) => setD((x) => ({ ...x, ...patch }));
  const majPiece = (p: Piece) => setD((x) => ({ ...x, pieces: x.pieces.map((y) => (y.id === p.id ? p : y)) }));

  const enregistrer = useCallback(
    async (donnees: Donnees) => {
      if (!id) {
        const r = await extranetPost<{ edl: { id: number; donnees: Donnees } }>('/api/edl', { donnees });
        setId(r.edl.id);
        setD({ ...vide(), ...r.edl.donnees });
        return r.edl.id;
      }
      await extranetRequete('PUT', `/api/edl/${id}`, { donnees });
      return id;
    },
    [id]
  );

  const suivant = async (versEtape?: number, donnees?: Donnees) => {
    setErr('');
    setBusy(true);
    try {
      await enregistrer(donnees || d);
      setEtape(versEtape ?? etape + 1);
    } catch (e: any) {
      setErr(e.message || 'Enregistrement impossible, vérifiez la connexion.');
    } finally {
      setBusy(false);
    }
  };

  const choisirLocataire = async (p: Personne, sorte: 'locataire' | 'candidat') => {
    setChoixPersonne(false);
    const loc = { nom: p.nom, email: p.email || '', tel: p.telephone || '', tenantAccountId: sorte === 'locataire' ? String(p.id) : null, crmId: sorte === 'candidat' ? Number(p.id) : null };
    const patch: Partial<Donnees> = { locataire: loc };
    if (p.adresse && !d.logement.adresse) patch.logement = { ...d.logement, adresse: p.adresse };
    maj(patch);
    if (d.type === 'sortie' && sorte === 'locataire') {
      setEntrees(null);
      try {
        const r = await extranetGet(`/api/edl?tenantAccountId=${encodeURIComponent(String(p.id))}&type=entree&statut=signe`);
        setEntrees(r.edl || []);
        if (r.edl && r.edl[0]) maj({ ...patch, entreeId: r.edl[0].id });
      } catch {
        setEntrees([]);
      }
    }
  };

  const signer = async () => {
    if (!id) return;
    setErr('');
    setBusy(true);
    try {
      await enregistrer(d);
      await extranetPost(`/api/edl/${id}/signer`, { luApprouve: lu, locataire: { ...sigLoc, nom: nomLoc || d.locataire.nom }, agence: { ...sigAg, nom: nomAg } });
      setFini(id);
    } catch (e: any) {
      setErr(e.message || 'Signature impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (fini) {
    return (
      <Ecran>
        <Titre sous="Le PDF est créé. S’il est rattaché à un locataire, il est déjà dans ses documents.">État des lieux signé ✓</Titre>
        <Bouton titre="Ouvrir le PDF" onPress={() => ouvrirDocument(`/api/edl/${fini}/pdf`, `etat-des-lieux-${fini}.pdf`).catch((e) => Alert.alert('PDF', e.message))} icone={<Ionicons name="document-text" size={18} color={C.navy} />} />
        <View style={{ height: 14 }} />
        <EnvoiMail edlId={fini} emailDefaut={d.locataire.email} />
        <View style={{ height: 10 }} />
        <Bouton titre="Retour à la liste" variante="contour" onPress={() => onFermer(true)} />
      </Ecran>
    );
  }

  if (choixPersonne) {
    return (
      <Ecran>
        <Titre>Choisir le locataire</Titre>
        <ChoixPersonne personnes={personnes} onChoisir={choisirLocataire} />
        <View style={{ height: 12 }} />
        <Bouton titre="Annuler" variante="contour" onPress={() => setChoixPersonne(false)} />
      </Ecran>
    );
  }

  return (
    <Ecran>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable
          onPress={() =>
            Alert.alert('Quitter ?', id ? 'L’état des lieux reste enregistré en brouillon : vous pourrez le reprendre.' : 'Rien n’est encore enregistré.', [
              { text: 'Continuer la saisie', style: 'cancel' },
              { text: 'Quitter', onPress: () => onFermer(true) },
            ])
          }
          hitSlop={10}
        >
          <Text style={{ color: C.navy2, fontWeight: '700' }}>‹ Liste</Text>
        </Pressable>
        {id ? <Badge texte={`Brouillon n° ${id}`} /> : null}
      </View>
      <BarreEtapes etapes={libellesBarre} actuelle={posBarre} />
      {err ? <Message type="erreur" texte={err} /> : null}

      {cle === 'type' && (
        <View>
          <EnteteEtape surtitre="Étape 1" titre="Entrée" italique="ou sortie ?" />
          <CarteChoix actif={d.type === 'entree'} onPress={() => maj({ type: 'entree', entreeId: null })} titre="État des lieux d’entrée" texte="Remise des clés au nouveau locataire" icone="enter-outline" />
          <CarteChoix actif={d.type === 'sortie'} onPress={() => maj({ type: 'sortie' })} titre="État des lieux de sortie" texte="L’état d’entrée est repris du profil du locataire" icone="exit-outline" delai={60} />
          <Champ label="Date de l’état des lieux (AAAA-MM-JJ)" valeur={d.date} onChange={(t) => maj({ date: t })} aide="Par défaut, la date du jour." />
          {sortie && !id ? (
            <Carte>
              <Text style={s.lib}>Locataire qui sort</Text>
              {d.locataire.nom ? <Text style={s.texte}>{d.locataire.nom}</Text> : <Text style={s.petit}>Choisissez le locataire pour reprendre son état des lieux d’entrée.</Text>}
              <View style={{ height: 8 }} />
              <Bouton titre={d.locataire.nom ? 'Changer' : 'Choisir le locataire'} variante="contour" onPress={() => setChoixPersonne(true)} />
              {entrees && !entrees.length ? <Message texte="Aucun état des lieux d’entrée signé sur tablette pour ce locataire : la saisie se fait complète, sans reprise." /> : null}
              {entrees && entrees.length ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={s.lib}>État des lieux d’entrée repris</Text>
                  {entrees.map((e) => (
                    <CarteChoix key={e.id} actif={d.entreeId === e.id} onPress={() => maj({ entreeId: e.id })} titre={`Entrée du ${dateFr(e.date)}`} texte={e.adresse} icone="document-text-outline" />
                  ))}
                </View>
              ) : null}
            </Carte>
          ) : null}
          <BoutonsEtape
            suivant={() => {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
                setErr('Date au format AAAA-MM-JJ, par exemple 2026-11-08.');
                return;
              }
              // Sortie reprise de l'entrée : le serveur recopie les pièces à la création
              const donnees = sortie && !id && d.entreeId ? { ...d, pieces: [] } : d;
              suivant(undefined, donnees);
            }}
            enCours={busy}
          />
        </View>
      )}

      {cle === 'infos' && (
        <View>
          <EnteteEtape surtitre="Étape 2" titre="Informations" italique="générales" />
          <Champ label="Date de l’état des lieux (AAAA-MM-JJ)" valeur={d.date} onChange={(t) => maj({ date: t })} />
          <AdresseAuto valeur={d.logement.adresse} onChange={(t) => maj({ logement: { ...d.logement, adresse: t } })} />
          <Choix label="Type de logement" options={TYPES_LOGEMENT} valeur={d.logement.typeLogement} onChange={(v) => maj({ logement: { ...d.logement, typeLogement: v } })} />
          <Choix label="Meublé" options={[['vide', 'Non meublé'], ['meuble', 'Meublé']] as [string, string][]} valeur={d.logement.meuble} onChange={(v) => maj({ logement: { ...d.logement, meuble: v } })} />
          <Champ label="Étage" valeur={d.logement.etage} onChange={(t) => maj({ logement: { ...d.logement, etage: t } })} placeholder="Ex. : RDC, 2e, combles" />
          <Choix label="Porte" options={PORTES} valeur={d.logement.porte} onChange={(v) => maj({ logement: { ...d.logement, porte: v } })} />
          <Carte>
            <Text style={s.lib}>Locataire</Text>
            <Text style={s.texte}>{d.locataire.nom || 'Non choisi'}</Text>
            {d.locataire.tenantAccountId ? <Badge texte="Locataire de l’agence" /> : d.locataire.crmId ? <Badge texte="Locataire en recherche" couleur={C.warn} fond={C.warnBg} /> : null}
            <View style={{ height: 8 }} />
            <Bouton titre="Choisir dans la liste" variante="contour" onPress={() => setChoixPersonne(true)} />
          </Carte>
          <Champ label="Nom du locataire (ou saisie libre)" valeur={d.locataire.nom} onChange={(t) => maj({ locataire: { ...d.locataire, nom: t } })} autoCap="words" />
          <Champ label="Email" valeur={d.locataire.email} onChange={(t) => maj({ locataire: { ...d.locataire, email: t } })} clavier="email-address" autoCap="none" />
          <Champ label="Téléphone" valeur={d.locataire.tel} onChange={(t) => maj({ locataire: { ...d.locataire, tel: t } })} clavier="phone-pad" />
          <Champ label="ID de la colocation" valeur={d.colocationId} onChange={(t) => maj({ colocationId: t })} placeholder="Si colocation (ex. COLOC-NEUDORF-1)" />
          <Choix label="Type de bail" options={[['individuel', 'Individuel'], ['solidaire', 'Solidaire'], ['na', 'Non applicable']] as [Donnees['typeBail'], string][]} valeur={d.typeBail} onChange={(v) => maj({ typeBail: v })} />
          <BoutonsEtape
            precedent={() => setEtape(etape - 1)}
            suivant={() => {
              if (!d.logement.adresse.trim() || !d.locataire.nom.trim()) {
                setErr('Indiquez au moins l’adresse et le nom du locataire.');
                return;
              }
              suivant();
            }}
            enCours={busy}
          />
        </View>
      )}

      {cle === 'cles' && id && (
        <View>
          <EnteteEtape surtitre="Étape 3" titre="Les clés" italique="et accès" texte="Prenez les clés en photo, puis comptez-les." />
          <Photos edlId={id} libelle="Photo des clés" liste={d.cles.photos || []} onChange={(l) => maj({ cles: { ...d.cles, photos: l } })} />
          <Carte>
            {CLES.map(([k, lib]) => (
              <Compteur key={k} libelle={lib} valeur={Number(d.cles[k]) || 0} avant={sortie && d.clesEntree ? Number(d.clesEntree[k]) || 0 : null} onChange={(n) => maj({ cles: { ...d.cles, [k]: n } })} />
            ))}
          </Carte>
          {Number(d.cles.autre) > 0 ? <Champ label="Autre : précisez" valeur={d.cles.autreLibelle || ''} onChange={(t) => maj({ cles: { ...d.cles, autreLibelle: t } })} placeholder="Ex. : local vélos, portail" /> : null}
          <BoutonsEtape precedent={() => setEtape(etape - 1)} suivant={() => suivant()} enCours={busy} />
        </View>
      )}

      {pieceCourante && id && (
        <View>
          <EnteteEtape cle={pieceCourante.id} surtitre={`Pièce ${indexPiece + 1} / ${d.pieces.length}`} titre={pieceCourante.nom} texte="Photo de la pièce, puis l’état de chaque élément." />
          {pieceCourante.type === 'chambre' || pieceCourante.type === 'sdb' ? <Champ label="Nom de la pièce" valeur={pieceCourante.nom} onChange={(t) => majPiece({ ...pieceCourante, nom: t })} /> : null}
          {pieceCourante.type === 'wc' ? (
            <Choix label="Type de WC" options={[['pose', 'WC posé'], ['suspendu', 'WC suspendu (bâti-support)']] as [string, string][]} valeur={pieceCourante.wcSuspendu ? 'suspendu' : 'pose'} onChange={(v) => majPiece({ ...pieceCourante, wcSuspendu: v === 'suspendu', elements: pieceCourante.elements.map((e) => (e.nom.startsWith('Bâti') && v === 'pose' ? { ...e, entree: sortie ? e.entree : 'Non applicable', sortie: sortie ? 'Non applicable' : e.sortie } : e)) })} />
          ) : null}
          {pieceCourante.type === 'sdb' && pieceCourante.wcInclus ? (
            <View>
              <Choix
                label="WC dans la salle de bain"
                options={[['pose', 'WC posé'], ['suspendu', 'WC suspendu (bâti-support)']] as [string, string][]}
                valeur={pieceCourante.wcSuspendu ? 'suspendu' : 'pose'}
                onChange={(v) => {
                  const sans = pieceCourante.elements.filter((e) => e.nom !== WC_BATI);
                  majPiece({ ...pieceCourante, wcSuspendu: v === 'suspendu', elements: v === 'suspendu' ? [...sans, { nom: WC_BATI, entree: '', sortie: '', obs: '' }] : sans });
                }}
              />
              <Pressable onPress={() => majPiece({ ...pieceCourante, wcInclus: false, wcSuspendu: false, elements: pieceCourante.elements.filter((e) => !e.nom.startsWith('WC :')) })} style={{ marginBottom: 8 }}>
                <Text style={{ color: C.danger, fontWeight: '700' }}>Retirer le WC</Text>
              </Pressable>
            </View>
          ) : null}
          <Photos edlId={id} libelle="Photo(s) de la pièce" liste={pieceCourante.photos} onChange={(l) => majPiece({ ...pieceCourante, photos: l })} />
          <Bouton
            titre="Tout en « Bon état » (puis corriger)"
            variante="contour"
            onPress={() => majPiece({ ...pieceCourante, elements: pieceCourante.elements.map((e) => (sortie ? { ...e, sortie: e.sortie || 'Bon état' } : { ...e, entree: e.entree || 'Bon état' })) })}
          />
          <Carte style={{ marginTop: 10 }}>
            {pieceCourante.elements.map((el, i) => (
              <LigneElement key={`${pieceCourante.id}-${i}`} el={el} sortie={sortie} etats={etats} onChange={(e2) => majPiece({ ...pieceCourante, elements: pieceCourante.elements.map((x, j) => (j === i ? e2 : x)) })} />
            ))}
          </Carte>
          <Champ label="Observations sur la pièce" valeur={pieceCourante.obs} onChange={(t) => majPiece({ ...pieceCourante, obs: t })} multiligne />
          {pieceCourante.type === 'chambre' && d.pieces.filter((p) => p.type === 'chambre').length > 1 ? (
            <Pressable
              onPress={() => {
                const pieces = d.pieces.filter((p) => p.id !== pieceCourante.id);
                maj({ pieces });
              }}
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
            >
              <Text style={{ color: C.danger, fontWeight: '700' }}>Supprimer cette pièce</Text>
            </Pressable>
          ) : null}

          {/* Boucle des chambres, puis salle de bain, puis toilettes séparées */}
          {dernierePiece && pieceCourante.type === 'chambre' ? (
            <View style={{ gap: 10, marginTop: 10 }}>
              <Bouton
                titre="+ Ajouter une chambre"
                variante="marine"
                onPress={() => {
                  const n = d.pieces.filter((p) => p.type === 'chambre').length + 1;
                  const pieces = [...d.pieces, nouvellePiece('chambre', `Chambre ${n}`)];
                  maj({ pieces });
                  suivant(etape + 1, { ...d, pieces });
                }}
              />
              <Bouton
                titre="Salle de bain ›"
                onPress={() => {
                  const pieces = [...d.pieces, nouvellePiece('sdb')];
                  maj({ pieces });
                  suivant(etape + 1, { ...d, pieces });
                }}
              />
              <Pressable onPress={() => setEtape(etape - 1)} style={{ alignSelf: 'flex-start' }}>
                <Text style={{ fontWeight: '700', color: C.ink }}>‹ Précédent</Text>
              </Pressable>
            </View>
          ) : dernierePiece && pieceCourante.type === 'sdb' && !pieceCourante.wcInclus ? (
            <View style={{ gap: 10, marginTop: 10 }}>
              <Text style={s.lib}>Les toilettes sont-elles séparées ?</Text>
              <Bouton
                titre="Oui : toilettes séparées ›"
                variante="marine"
                onPress={() => {
                  const pieces = [...d.pieces, nouvellePiece('wc')];
                  maj({ pieces });
                  suivant(etape + 1, { ...d, pieces });
                }}
              />
              <Bouton
                titre="Non, WC dans la salle de bain"
                onPress={() =>
                  majPiece({ ...pieceCourante, wcInclus: true, wcSuspendu: false, elements: [...pieceCourante.elements.filter((e) => !e.nom.startsWith('WC :')), ...WC_SDB.map((n) => ({ nom: n, entree: '', sortie: '', obs: '' }))] })
                }
              />
              <Bouton
                titre="+ Autre salle de bain"
                variante="contour"
                onPress={() => {
                  const pieces = [...d.pieces, nouvellePiece('sdb', `Salle de bain ${d.pieces.filter((p) => p.type === 'sdb').length + 1}`)];
                  maj({ pieces });
                  suivant(etape + 1, { ...d, pieces });
                }}
              />
              <Pressable onPress={() => setEtape(etape - 1)} style={{ alignSelf: 'flex-start' }}>
                <Text style={{ fontWeight: '700', color: C.ink }}>‹ Précédent</Text>
              </Pressable>
            </View>
          ) : (
            <BoutonsEtape precedent={() => setEtape(etape - 1)} suivant={() => suivant()} enCours={busy} />
          )}
        </View>
      )}

      {cle === 'obs' && (
        <View>
          <EnteteEtape surtitre="Étape 8" titre="Observations" italique="générales" />
          <Champ label="Observations" valeur={d.observations} onChange={(t) => maj({ observations: t })} multiligne placeholder="Relevés de compteurs (électricité, gaz, eau), réserves, travaux convenus…" />
          <BoutonsEtape precedent={() => setEtape(etape - 1)} suivant={() => suivant()} libelle="Passer à la signature" enCours={busy} />
        </View>
      )}

      {cle === 'signature' && (
        <View>
          <EnteteEtape surtitre="Signature" titre="Lu" italique="et approuvé" texte="Faites relire le récapitulatif au locataire, puis signez chacun dans le cadre." />
          <Carte>
            <Text style={s.texte}>
              {sortie ? 'Sortie' : 'Entrée'} du {dateFr(d.date)} — {d.locataire.nom}
            </Text>
            <Text style={s.petit}>{d.logement.adresse}</Text>
            <Text style={s.petit}>
              {d.pieces.length} pièces · {d.pieces.reduce((n, p) => n + p.elements.filter((e) => /Mauvais|Hors service/.test(sortie ? e.sortie : e.entree)).length, 0)} élément(s) en mauvais état ou hors service
            </Text>
            <View style={{ height: 8 }} />
            {id ? <Bouton titre="Aperçu du PDF" variante="contour" onPress={() => enregistrer(d).then(() => ouvrirDocument(`/api/edl/${id}/pdf`, `apercu-edl-${id}.pdf`)).catch((e) => Alert.alert('Aperçu', e.message))} /> : null}
          </Carte>
          <PadSignature titre="Le locataire" nom={nomLoc || d.locataire.nom} onNom={setNomLoc} valeur={sigLoc} onChange={setSigLoc} />
          <PadSignature titre="Pour l’agence" nom={nomAg} onNom={setNomAg} valeur={sigAg} onChange={setSigAg} />
          <Pressable onPress={() => setLu((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Ionicons name={lu ? 'checkbox' : 'square-outline'} size={26} color={C.navy} />
            <Text style={[s.texte, { flex: 1 }]}>« Lu et approuvé » : les parties reconnaissent l’exactitude du présent état des lieux.</Text>
          </Pressable>
          <BoutonsEtape precedent={() => setEtape(etape - 1)} suivant={signer} libelle="Signer et terminer" desactive={!lu || !sigLoc.traits.length || !sigAg.traits.length} enCours={busy} />
        </View>
      )}
    </Ecran>
  );
}

// ---------- Liste ----------
export default function EtatsDesLieux() {
  const [liste, setListe] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const [ouvert, setOuvert] = useState<{ id: number; donnees: Donnees } | null | 'nouveau'>(null);
  const [rafraichir, setRafraichir] = useState(false);

  const charger = useCallback(() => {
    setRafraichir(true);
    extranetGet('/api/edl')
      .then((r) => {
        setListe(r.edl || []);
        setErr('');
      })
      .catch((e) => setErr(e.message))
      .finally(() => setRafraichir(false));
  }, []);
  useEffect(charger, [charger]);

  if (ouvert)
    return (
      <Assistant
        depart={ouvert === 'nouveau' ? null : ouvert}
        onFermer={(r) => {
          setOuvert(null);
          if (r) charger();
        }}
      />
    );

  const reprendre = async (id: number) => {
    try {
      const r = await extranetGet(`/api/edl/${id}`);
      setOuvert({ id, donnees: r.edl.donnees });
    } catch (e: any) {
      Alert.alert('État des lieux', e.message);
    }
  };

  return (
    <Ecran onRefresh={charger} refreshing={rafraichir}>
      <Titre sous="Entrée ou sortie, pièce par pièce, avec photos et signature sur la tablette.">États des lieux</Titre>
      <Bouton titre="+ Nouvel état des lieux" onPress={() => setOuvert('nouveau')} />
      {err ? <Message type="erreur" texte={err} /> : null}
      <View style={{ height: 12 }} />
      {!liste ? (
        <Chargement />
      ) : !liste.length ? (
        <Vide texte="Aucun état des lieux pour le moment." />
      ) : (
        liste.map((e) => (
          <Carte key={e.id} onPress={() => (e.statut === 'signe' ? ouvrirDocument(`/api/edl/${e.id}/pdf`, `etat-des-lieux-${e.id}.pdf`).catch((x) => Alert.alert('PDF', x.message)) : reprendre(e.id))}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, flex: 1 }}>
                {e.type === 'sortie' ? 'Sortie' : 'Entrée'} — {e.locataireNom || 'Sans nom'}
              </Text>
              {e.statut === 'signe' ? <Badge texte="Signé · PDF" couleur={C.ok} fond={C.okBg} /> : <Badge texte="Brouillon · reprendre" couleur={C.warn} fond={C.warnBg} />}
            </View>
            <Text style={s.petit}>
              {dateFr(e.date)} · {e.adresse || 'adresse à compléter'}
              {e.tenantAccountId ? ' · rattaché au locataire' : ''}
            </Text>
          </Carte>
        ))
      )}
    </Ecran>
  );
}
