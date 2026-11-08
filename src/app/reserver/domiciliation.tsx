import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChoixHeure, ChoixJour, dateLongue, prochainsJours } from '@/components/dates';
import { Apparition, Bandeau, BarreEtapes, BoutonsEtape, CarteChoix, Confirmation, EnteteEtape, THEMES } from '@/components/etapes';
import { Champ } from '@/components/form';
import { Carte, Chargement, Ecran, Ligne, Message, s as ui } from '@/components/ui';
import { extranetGet, extranetPost } from '@/lib/api';
import { C } from '@/lib/theme';

// Souscription à la domiciliation, en 4 étapes (style des vidéos) :
// société, représentant, rendez-vous de signature à l'agence, récapitulatif.
const FORMES: { v: string; titre: string; icone: 'business-outline' | 'home-outline' | 'person-outline' | 'people-outline' | 'ellipsis-horizontal' }[] = [
  { v: 'SARL', titre: 'SARL', icone: 'business-outline' },
  { v: 'SAS', titre: 'SAS', icone: 'business-outline' },
  { v: 'SASU', titre: 'SASU', icone: 'person-outline' },
  { v: 'EURL', titre: 'EURL', icone: 'person-outline' },
  { v: 'SCI', titre: 'SCI', icone: 'home-outline' },
  { v: 'Entreprise individuelle', titre: 'Entreprise individuelle', icone: 'person-outline' },
  { v: 'Association', titre: 'Association', icone: 'people-outline' },
  { v: 'Autre', titre: 'Autre', icone: 'ellipsis-horizontal' },
];
const ETAPES = ['Société', 'Représentant', 'Rendez-vous', 'Récapitulatif'];
const T = 'agence' as const;

export default function SouscrireDomiciliation() {
  const [etape, setEtape] = useState(0);
  const [societe, setSociete] = useState('');
  const [forme, setForme] = useState('SARL');
  const [siret, setSiret] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [creneaux, setCreneaux] = useState<{ slots: string[]; busy: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fait, setFait] = useState(false);
  const jours = useMemo(() => prochainsJours(30, undefined, 1), []);

  useEffect(() => {
    if (!date) return;
    setCreneaux(null);
    setHeure('');
    extranetGet<{ slots: string[]; busy: string[] }>(`/api/domiciliation/availability?date=${date}`)
      .then(setCreneaux)
      .catch(() => setCreneaux({ slots: [], busy: [] }));
  }, [date]);

  const aller = (i: number) => {
    setErr('');
    setEtape(i);
  };

  const valide = (i: number): string => {
    if (i === 0) {
      if (societe.trim().length < 2) return 'Indiquez le nom de la société.';
      if (siret.replace(/\D/g, '').length !== 14) return 'Le SIRET comporte 14 chiffres.';
    }
    if (i === 1) {
      if (!/^[A-Za-zÀ-ÿ' -]{2,}$/.test(nom.trim()) || !/^[A-Za-zÀ-ÿ' -]{2,}$/.test(prenom.trim())) return 'Indiquez le nom et le prénom du dirigeant.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'Adresse email invalide.';
      if (tel.replace(/\D/g, '').length !== 10) return 'Téléphone : 10 chiffres.';
    }
    if (i === 2 && (!date || !heure)) return 'Choisissez un jour et une heure.';
    return '';
  };
  const suivant = () => {
    const e = valide(etape);
    if (e) return setErr(e);
    aller(etape + 1);
  };

  const valider = async () => {
    setBusy(true);
    setErr('');
    try {
      await extranetPost('/api/domiciliation/reserve', {
        companyName: societe.trim(),
        legalForm: forme,
        siret: siret.replace(/\D/g, ''),
        managerName: nom.trim(),
        managerFirstname: prenom.trim(),
        email: email.trim(),
        phone: tel.replace(/\D/g, ''),
        signatureDate: date,
        signatureTime: heure,
        message: message.trim().slice(0, 250) || undefined,
      });
      setFait(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (fait)
    return (
      <Ecran basExtra={30}>
        <Confirmation titre="C’est noté !" theme={T}>
          <Text style={{ color: 'rgba(255,255,255,0.88)', textAlign: 'center', lineHeight: 20 }}>
            Rendez-vous de signature le {dateLongue(date)} à {heure}, 21 rue Sellénick. Vous recevez la confirmation par email.
          </Text>
        </Confirmation>
        <BoutonsEtape theme={T} suivant={() => router.back()} libelle="Terminer" />
      </Ecran>
    );

  return (
    <Ecran basExtra={30} fond={THEMES[T].fond}>
      <Pressable onPress={() => (etape > 0 ? aller(etape - 1) : router.back())} style={{ marginBottom: 10 }}>
        <Text style={{ color: C.navy, fontWeight: '700' }}>‹ {etape > 0 ? 'Étape précédente' : 'Retour'}</Text>
      </Pressable>
      {etape === 0 ? <Bandeau theme={T} surtitre="Domiciliation · 65 € HT / mois" titre="Votre siège social," italique="au cœur de Strasbourg." /> : null}
      <BarreEtapes etapes={ETAPES} actuelle={etape} theme={T} onAller={aller} />

      {etape === 0 ? (
        <>
          <EnteteEtape cle={0} theme={T} surtitre="Votre société" titre="Présentez-nous" italique="votre société." />
          <Champ label="Nom de la société" valeur={societe} onChange={setSociete} />
          <Champ label="SIRET (14 chiffres)" valeur={siret} onChange={setSiret} clavier="number-pad" />
          <Text style={ui.lib}>Forme juridique</Text>
          {FORMES.map((f, i) => (
            <CarteChoix key={f.v} theme={T} actif={forme === f.v} onPress={() => setForme(f.v)} titre={f.titre} icone={f.icone} delai={i * 40} />
          ))}
        </>
      ) : null}

      {etape === 1 ? (
        <Apparition cle={1}>
          <EnteteEtape cle={1} theme={T} surtitre="Le représentant" titre="Qui signe" italique="le contrat ?" />
          <Champ label="Nom du dirigeant" valeur={nom} onChange={setNom} autoCap="words" />
          <Champ label="Prénom du dirigeant" valeur={prenom} onChange={setPrenom} autoCap="words" />
          <Champ label="Email" valeur={email} onChange={setEmail} clavier="email-address" autoCap="none" />
          <Champ label="Téléphone" valeur={tel} onChange={setTel} clavier="phone-pad" />
          <Champ label="Message (facultatif)" valeur={message} onChange={(t) => setMessage(t.slice(0, 250))} multiligne />
        </Apparition>
      ) : null}

      {etape === 2 ? (
        <Apparition cle={2}>
          <EnteteEtape cle={2} theme={T} surtitre="Rendez-vous" titre="Signature" italique="à l’agence." texte="Choisissez un créneau pour signer le contrat, 21 rue Sellénick." />
          <Text style={ui.lib}>Jour</Text>
          <ChoixJour jours={jours} valeur={date} onChange={setDate} />
          {date ? creneaux ? <ChoixHeure heures={creneaux.slots} valeur={heure} onChange={setHeure} prises={creneaux.busy} /> : <Chargement texte="Créneaux…" /> : null}
        </Apparition>
      ) : null}

      {etape === 3 ? (
        <Apparition cle={3}>
          <EnteteEtape cle={3} theme={T} surtitre="Récapitulatif" titre="Tout est prêt," italique="vérifiez et validez." />
          <Carte>
            <Ligne libelle="Société" valeur={`${societe} (${forme})`} />
            <Ligne libelle="SIRET" valeur={siret.replace(/\D/g, '')} />
            <Ligne libelle="Représentant" valeur={`${prenom} ${nom}`} />
            <Ligne libelle="Email" valeur={email} />
            <Ligne libelle="Rendez-vous" valeur={`${dateLongue(date)} à ${heure}`} gras />
            <Ligne libelle="Tarif" valeur="65 € HT / mois" />
          </Carte>
        </Apparition>
      ) : null}

      {err ? <Message type="erreur" texte={err} /> : null}
      <View>
        <BoutonsEtape
          theme={T}
          precedent={etape > 0 ? () => aller(etape - 1) : undefined}
          suivant={etape < 3 ? suivant : valider}
          libelle={etape < 3 ? 'Continuer' : 'Valider ma souscription'}
          enCours={busy}
        />
      </View>
    </Ecran>
  );
}
