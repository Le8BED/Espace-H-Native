import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Apparition, Bandeau, BarreEtapes, BoutonsEtape, CarteChoix, Confirmation, EnteteEtape, THEMES } from '@/components/etapes';
import { Champ } from '@/components/form';
import { Carte, Ecran, Ligne, Message, s as ui } from '@/components/ui';
import { SITE } from '@/lib/theme';

// Publicité sur l'écran en vitrine de l'agence (même parcours que la page
// /pub du site, couleurs marketing). Abonnement annuel facturé chaque mois.
// Les règles et tarifs sont les mêmes que sur le site (src/lib/pub.ts) ; le
// serveur refait tous les contrôles et le calcul.

type Type = 'photo' | 'video';
type Visuel = 'fourni' | 'cree';
type Fichier = { uri: string; name: string; type: string; size?: number };

const DUREES = { photo: { min: 20, max: 45, pas: 5 }, video: { min: 45, max: 200, pas: 5 } };
const FREQUENCES = [10, 20, 30, 50, 100];
const OCCUPATION_MAX = 3 * 60 * 60;
const prixMois = (duree: number, freq: number) => Math.max(29, Math.round(0.08 * duree * freq * 100) / 100);
const creation = (type: Type, visuel: Visuel, duree: number) => (visuel !== 'cree' ? 0 : type === 'photo' ? 150 : 300 + Math.max(0, duree - 45) * 2);
const eur = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;

const ETAPES = ['Format', 'Contenu', 'Diffusion', 'Société', 'Envoi'];
const T = 'pub' as const;
const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_VIDEO = 150 * 1024 * 1024;

async function choisirFichier(types: string[]): Promise<Fichier | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.name || 'fichier', type: a.mimeType || 'application/octet-stream', size: a.size };
}

export default function ReserverPub() {
  const [etape, setEtape] = useState(0);
  const [type, setType] = useState<Type | null>(null);
  const [visuel, setVisuel] = useState<Visuel | null>(null);
  const [duree, setDuree] = useState(20);
  const [frequence, setFrequence] = useState(20);
  const [logo, setLogo] = useState<Fichier | null>(null);
  const [fichier, setFichier] = useState<Fichier | null>(null);
  const [photos, setPhotos] = useState<Fichier[]>([]);
  const [activite, setActivite] = useState('');
  const [societe, setSociete] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [siret, setSiret] = useState('');
  const [tva, setTva] = useState('');
  const [nonAssujetti, setNonAssujetti] = useState(false);
  const [adresse, setAdresse] = useState('');
  const [rgpd, setRgpd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fait, setFait] = useState<number | null>(null);

  const mensuel = useMemo(() => prixMois(duree, frequence), [duree, frequence]);
  const forfait = type && visuel ? creation(type, visuel, duree) : 0;

  const aller = (i: number) => {
    setErr('');
    setEtape(i);
  };
  const choisirType = (t: Type) => {
    setType(t);
    setDuree(DUREES[t].min);
    setFichier(null);
    if (DUREES[t].min * frequence > OCCUPATION_MAX) setFrequence(10);
  };
  const changerDuree = (d: number) => {
    if (!type) return;
    const v = Math.min(DUREES[type].max, Math.max(DUREES[type].min, d));
    setDuree(v);
    if (v * frequence > OCCUPATION_MAX) setFrequence([...FREQUENCES].reverse().find((f) => v * f <= OCCUPATION_MAX) || 10);
  };

  const ajouterPhotos = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5 - photos.length, quality: 0.85 });
      if (r.canceled) return;
      const neuves = r.assets.map((a, i) => ({ uri: a.uri, name: a.fileName || `photo-${Date.now()}-${i}.jpg`, type: a.mimeType || 'image/jpeg', size: a.fileSize }));
      setPhotos((p) => [...p, ...neuves].slice(0, 5));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const valide = (i: number): string => {
    if (i === 0 && (!type || !visuel)) return 'Choisissez le format et qui prépare le visuel.';
    if (i === 1) {
      if (!logo) return 'Joignez votre logo (un seul fichier).';
      if ((logo.size || 0) > MAX_IMAGE) return 'Le logo dépasse 15 Mo.';
      if (visuel === 'cree') {
        if (!/\.(svg|pdf|ai|eps)$/i.test(logo.name)) return 'Logo : format vectoriel attendu (SVG, PDF, AI ou EPS).';
        if (!activite.trim()) return 'Décrivez votre activité ou votre idée, avec les textes à afficher.';
      } else {
        if (!fichier) return type === 'video' ? 'Joignez votre vidéo (format paysage).' : 'Joignez votre visuel (format paysage).';
        if ((fichier.size || 0) > (type === 'video' ? MAX_VIDEO : MAX_IMAGE)) return type === 'video' ? 'Vidéo : 150 Mo maximum.' : 'Visuel : 15 Mo maximum.';
      }
    }
    if (i === 3) {
      if (!societe.trim()) return 'Indiquez le nom de la société.';
      if (!prenom.trim() || !nom.trim()) return 'Indiquez le nom et le prénom du contact.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'Adresse email invalide.';
      if (!/^0[1-9][0-9]{8}$/.test(tel.replace(/\s/g, ''))) return 'Téléphone : 10 chiffres.';
      if (!/^[0-9]{14}$/.test(siret.replace(/\s/g, ''))) return 'SIRET : 14 chiffres.';
      if (!nonAssujetti && !/^[0-9]{11}$/.test(tva.replace(/\D/g, ''))) return 'TVA : FR suivi de 11 chiffres (ou « non assujetti »).';
      if (!adresse.trim()) return 'Indiquez l’adresse de la société.';
    }
    return '';
  };
  const suivant = () => {
    const e = valide(etape);
    if (e) return setErr(e);
    aller(etape + 1);
  };

  const envoyer = async () => {
    if (!rgpd) return setErr('Merci d’accepter le traitement de vos données pour cette demande.');
    if (!type || !visuel || !logo) return;
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('visuel', visuel);
      fd.append('duree', String(duree));
      fd.append('frequence', String(frequence));
      fd.append('societe', societe.trim());
      fd.append('prenom', prenom.trim());
      fd.append('nom', nom.trim());
      fd.append('email', email.trim());
      fd.append('telephone', tel.replace(/\s/g, ''));
      fd.append('siret', siret.replace(/\s/g, ''));
      fd.append('tva', tva.replace(/\D/g, ''));
      if (nonAssujetti) fd.append('nonAssujetti', 'on');
      fd.append('adresse', adresse.trim());
      fd.append('rgpd', 'on');
      if (activite.trim()) fd.append('activite', activite.trim().slice(0, 1500));
      const rn = (f: Fichier) => ({ uri: f.uri, name: f.name, type: f.type }) as unknown as Blob;
      fd.append('logo', rn(logo));
      if (visuel === 'cree') photos.forEach((p) => fd.append('photos', rn(p)));
      else if (fichier) fd.append('fichier', rn(fichier));
      const r = await fetch(`${SITE}/api/app/pub`, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
      let data: { ok?: boolean; error?: string; totalHT?: number } = {};
      try {
        data = await r.json();
      } catch {
        data = {};
      }
      if (!r.ok || !data.ok) throw new Error(data.error || (r.status === 413 ? 'Fichier trop lourd pour l’envoi.' : `Erreur ${r.status}`));
      setFait(data.totalHT ?? mensuel);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const c = THEMES[T];

  if (fait != null)
    return (
      <Ecran basExtra={30} fond={c.fond}>
        <Confirmation titre="Demande envoyée !" theme={T}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20 }}>
            Estimation : {eur(fait)} HT / mois (abonnement annuel). L’agence revient vers vous pour valider le visuel et la date de démarrage.
          </Text>
        </Confirmation>
        <BoutonsEtape theme={T} suivant={() => router.back()} libelle="Terminer" />
      </Ecran>
    );

  return (
    <Ecran basExtra={30} fond={c.fond}>
      <Pressable onPress={() => (etape > 0 ? aller(etape - 1) : router.back())} style={{ marginBottom: 10 }}>
        <Text style={{ color: c.fonce, fontWeight: '700' }}>‹ {etape > 0 ? 'Étape précédente' : 'Retour'}</Text>
      </Pressable>
      {etape === 0 ? <Bandeau theme={T} surtitre="Écran en vitrine · 21 rue Sellénick" titre="Votre pub," italique="en vitrine." texte="Photo ou vidéo, fournie par vous ou créée par nos soins. Format paysage." /> : null}
      <BarreEtapes etapes={ETAPES} actuelle={etape} theme={T} onAller={aller} />

      {etape === 0 ? (
        <>
          <EnteteEtape cle={0} theme={T} surtitre="Le format" titre="Photo" italique="ou vidéo ?" />
          <CarteChoix theme={T} actif={type === 'photo'} onPress={() => choisirType('photo')} icone="image-outline" titre="Photo" texte="20 à 45 secondes à l’écran." />
          <CarteChoix theme={T} delai={60} actif={type === 'video'} onPress={() => choisirType('video')} icone="videocam-outline" titre="Vidéo" texte="45 secondes à 3 min 20, 150 Mo maximum." />
          <Text style={[ui.lib, { marginTop: 10 }]}>Le visuel</Text>
          <CarteChoix theme={T} delai={120} actif={visuel === 'fourni'} onPress={() => setVisuel('fourni')} icone="cloud-upload-outline" titre="Je fournis mon visuel" texte="1 visuel prêt + votre logo." />
          <CarteChoix theme={T} delai={180} actif={visuel === 'cree'} onPress={() => setVisuel('cree')} icone="color-palette-outline" titre="L’agence le crée" texte={`Logo vectoriel + 5 photos max. Forfait ${type === 'video' ? 'à partir de 300 €' : '150 €'} HT.`} />
        </>
      ) : null}

      {etape === 1 ? (
        <Apparition cle={1}>
          <EnteteEtape cle={1} theme={T} surtitre="Le contenu" titre="Envoyez-nous" italique="vos fichiers." texte="Format paysage uniquement, sans lien ni QR code vers un site." />
          <BoutonFichier
            titre={visuel === 'cree' ? 'Logo vectoriel (SVG, PDF, AI, EPS)' : 'Logo (SVG, PDF, AI, EPS, JPG, PNG)'}
            fichier={logo}
            onPress={async () => {
              try {
                const f = await choisirFichier(visuel === 'cree' ? ['image/svg+xml', 'application/pdf', 'application/postscript', 'application/illustrator', '*/*'] : ['image/*', 'application/pdf', 'application/postscript', '*/*']);
                if (f) setLogo(f);
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          />
          {visuel === 'fourni' ? (
            <BoutonFichier
              titre={type === 'video' ? 'Votre vidéo (MP4, MOV, WEBM)' : 'Votre visuel (JPG, PNG, WEBP, HEIC)'}
              fichier={fichier}
              onPress={async () => {
                try {
                  const f = await choisirFichier(type === 'video' ? ['video/*'] : ['image/*']);
                  if (f) setFichier(f);
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
            />
          ) : (
            <>
              <BoutonFichier titre={`Photos de vos produits ou projets (${photos.length}/5)`} fichier={null} onPress={photos.length < 5 ? ajouterPhotos : () => undefined} />
              {photos.map((p, i) => (
                <View key={p.uri} style={st.fichierLigne}>
                  <Ionicons name="image-outline" size={18} color={c.accent} />
                  <Text style={{ flex: 1 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Pressable onPress={() => setPhotos((l) => l.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={20} color="#9aa3ae" />
                  </Pressable>
                </View>
              ))}
              <Champ label="Votre activité, votre idée, les textes à afficher" valeur={activite} onChange={(t) => setActivite(t.slice(0, 1500))} multiligne />
            </>
          )}
        </Apparition>
      ) : null}

      {etape === 2 && type ? (
        <Apparition cle={2}>
          <EnteteEtape cle={2} theme={T} surtitre="La diffusion" titre="Combien de temps," italique="combien de fois ?" />
          <Text style={ui.lib}>Durée à l’écran</Text>
          <View style={st.compteur}>
            <Pressable onPress={() => changerDuree(duree - DUREES[type].pas)} style={st.rondBtn}>
              <Ionicons name="remove" size={22} color={c.fonce} />
            </Pressable>
            <Text style={st.compteurVal}>{duree} s</Text>
            <Pressable onPress={() => changerDuree(duree + DUREES[type].pas)} style={st.rondBtn}>
              <Ionicons name="add" size={22} color={c.fonce} />
            </Pressable>
          </View>
          <Text style={[ui.lib, { marginTop: 14 }]}>Passages par jour (minimum garanti)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FREQUENCES.map((f) => {
              const ok = duree * f <= OCCUPATION_MAX;
              const actif = frequence === f;
              return (
                <Pressable key={f} disabled={!ok} onPress={() => setFrequence(f)} style={[st.puce, !ok && { opacity: 0.35 }, !actif && { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e6dcf5' }]}>
                  {actif ? <LinearGradient colors={c.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} /> : null}
                  <Text style={{ color: actif ? '#fff' : c.fonce, fontWeight: '800' }}>{f} / jour</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={st.estimation}>
            <LinearGradient colors={c.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 22 }]} />
            <Text style={{ color: c.accent2, fontWeight: '800', letterSpacing: 2, fontSize: 11 }}>ESTIMATION</Text>
            <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 }}>{eur(mensuel)} HT / mois</Text>
            <Text style={{ color: 'rgba(255,255,255,0.88)', marginTop: 4 }}>
              soit {eur(Math.round(mensuel * 1.2 * 100) / 100)} TTC · abonnement annuel facturé chaque mois
              {forfait ? `\n+ création du visuel : ${eur(forfait)} HT (une fois)` : ''}
            </Text>
          </View>
        </Apparition>
      ) : null}

      {etape === 3 ? (
        <Apparition cle={3}>
          <EnteteEtape cle={3} theme={T} surtitre="Votre société" titre="Faisons" italique="connaissance." />
          <Champ label="Société" valeur={societe} onChange={setSociete} />
          <Champ label="Prénom" valeur={prenom} onChange={setPrenom} autoCap="words" />
          <Champ label="Nom" valeur={nom} onChange={setNom} autoCap="words" />
          <Champ label="Email" valeur={email} onChange={setEmail} clavier="email-address" autoCap="none" />
          <Champ label="Téléphone" valeur={tel} onChange={setTel} clavier="phone-pad" />
          <Champ label="SIRET (14 chiffres)" valeur={siret} onChange={(t) => setSiret(t.replace(/\D/g, '').slice(0, 14))} clavier="number-pad" />
          {!nonAssujetti ? <Champ label="N° de TVA : FR + 11 chiffres" valeur={tva} onChange={(t) => setTva(t.replace(/\D/g, '').slice(0, 11))} clavier="number-pad" placeholder="FR · 11 chiffres" /> : null}
          <View style={st.interrupteur}>
            <Text style={{ flex: 1, color: '#131c28' }}>Non assujetti à la TVA</Text>
            <Switch value={nonAssujetti} onValueChange={setNonAssujetti} trackColor={{ true: c.accent }} />
          </View>
          <Champ label="Adresse de la société" valeur={adresse} onChange={setAdresse} />
        </Apparition>
      ) : null}

      {etape === 4 && type && visuel ? (
        <Apparition cle={4}>
          <EnteteEtape cle={4} theme={T} surtitre="Récapitulatif" titre="On y est" italique="presque !" />
          <Carte>
            <Ligne libelle="Format" valeur={`${type === 'photo' ? 'Photo' : 'Vidéo'} · ${duree} s`} />
            <Ligne libelle="Visuel" valeur={visuel === 'fourni' ? 'Fourni par vous' : 'Créé par l’agence'} />
            <Ligne libelle="Passages" valeur={`${frequence} par jour`} />
            <Ligne libelle="Abonnement" valeur={`${eur(mensuel)} HT / mois`} gras />
            {forfait ? <Ligne libelle="Création" valeur={`${eur(forfait)} HT`} /> : null}
            <Ligne libelle="Société" valeur={societe} />
          </Carte>
          <View style={st.interrupteur}>
            <Text style={{ flex: 1, color: '#131c28', fontSize: 13.5, lineHeight: 18 }}>J’accepte que mes données soient utilisées pour traiter cette demande.</Text>
            <Switch value={rgpd} onValueChange={setRgpd} trackColor={{ true: c.accent }} />
          </View>
        </Apparition>
      ) : null}

      {err ? <Message type="erreur" texte={err} /> : null}
      <BoutonsEtape theme={T} precedent={etape > 0 ? () => aller(etape - 1) : undefined} suivant={etape < 4 ? suivant : envoyer} libelle={etape < 4 ? 'Continuer' : 'Envoyer ma demande'} enCours={busy} />
    </Ecran>
  );
}

function BoutonFichier({ titre, fichier, onPress }: { titre: string; fichier: Fichier | null; onPress: () => void }) {
  const c = THEMES[T];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.fichier, { borderColor: fichier ? c.accent : '#e6dcf5' }, pressed && { opacity: 0.85 }]}>
      <Ionicons name={fichier ? 'checkmark-circle' : 'cloud-upload-outline'} size={24} color={c.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', color: c.fonce }}>{titre}</Text>
        <Text style={{ color: '#57616f', fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {fichier ? fichier.name : 'Toucher pour choisir'}
        </Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  fichier: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderStyle: 'dashed', borderRadius: 18, padding: 14, marginBottom: 10, backgroundColor: '#fff' },
  fichierLigne: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4 },
  compteur: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 12, borderWidth: 1.5, borderColor: '#e6dcf5' },
  compteurVal: { fontSize: 28, fontWeight: '900', color: '#2a0f55', minWidth: 90, textAlign: 'center' },
  rondBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff0f3', alignItems: 'center', justifyContent: 'center' },
  puce: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, overflow: 'hidden' },
  estimation: { borderRadius: 22, padding: 18, marginTop: 18, overflow: 'hidden' },
  interrupteur: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#ece6f5' },
});
