import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChoixHeure, ChoixJour, dateLongue, prochainsJours } from '@/components/dates';
import { Champ, Choix } from '@/components/form';
import { Bouton, Carte, Chargement, Ecran, Ligne, Message, s as ui } from '@/components/ui';
import { extranetGet, extranetPost, extranetRequete } from '@/lib/api';
import { useBiens } from '@/lib/biens';
import { eur } from '@/lib/format';
import { C } from '@/lib/theme';

// Pré-réservation d'un lot du programme Les Jardins de la Sauer, puis choix
// du rendez-vous de signature à l'agence. Sans valeur contractuelle : le bon
// de réservation est signé en personne.

const nombre = (v: string) => Number(String(v).replace(',', '.').replace(/[^\d.]/g, '')) || 0;

export default function ReserverVefa() {
  const { lot: code } = useLocalSearchParams<{ lot: string }>();
  const { lots } = useBiens();
  const lot = lots.find((l) => l.lot === code);
  const [etape, setEtape] = useState(1);
  const [civ, setCiv] = useState<'M' | 'Mme'>('M');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [naissance, setNaissance] = useState('');
  const [lieu, setLieu] = useState('');
  const [adresse, setAdresse] = useState('');
  const [cp, setCp] = useState('');
  const [ville, setVille] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [situation, setSituation] = useState('Célibataire');
  const [financement, setFinancement] = useState<'comptant' | 'pret'>('pret');
  const [emprunt, setEmprunt] = useState('');
  const [message, setMessage] = useState('');
  const [id, setId] = useState<string | number | null>(null);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [creneaux, setCreneaux] = useState<{ slots: string[]; busy: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const jours = useMemo(() => prochainsJours(30, undefined, 1), []);

  useEffect(() => {
    if (!date) return;
    setCreneaux(null);
    setHeure('');
    extranetGet<{ slots: string[]; busy: string[] }>(`/api/vefa/availability?date=${date}`)
      .then(setCreneaux)
      .catch(() => setCreneaux({ slots: [], busy: [] }));
  }, [date]);

  if (!lot)
    return (
      <Ecran>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: C.navy, fontWeight: '700' }}>‹ Retour</Text>
        </Pressable>
        <Message texte="Ce lot n’est plus disponible." />
      </Ecran>
    );

  // JJ/MM/AAAA -> AAAA-MM-JJ, majeur
  const naissanceIso = () => {
    const m = naissance.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return '';
    return `${m[3]}-${m[2]}-${m[1]}`;
  };

  const envoyer = async () => {
    setErr('');
    const dn = naissanceIso();
    if (nom.trim().length < 2 || prenom.trim().length < 2) return setErr('Indiquez votre nom et votre prénom.');
    if (!dn) return setErr('Date de naissance au format JJ/MM/AAAA.');
    const age = (Date.now() - new Date(`${dn}T12:00:00`).getTime()) / (365.25 * 864e5);
    if (!(age >= 18)) return setErr('Vous devez être majeur.');
    if (adresse.trim().length < 4 || !/^\d{5}$/.test(cp.trim()) || ville.trim().length < 2) return setErr('Adresse complète requise (code postal à 5 chiffres).');
    if (tel.replace(/\D/g, '').length !== 10) return setErr('Téléphone : 10 chiffres.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErr('Adresse email invalide.');
    setBusy(true);
    try {
      const r = await extranetPost<{ ok: boolean; id: number }>('/api/vefa/reserve', {
        lot: lot.lot,
        projectQuartier: 'Les Jardins de la Sauer — Wœrth',
        price: lot.prix,
        surface: lot.surface,
        expo: lot.expo,
        pieces: nombre(lot.type) || undefined,
        civilite: civ,
        nom: nom.trim(),
        prenom: prenom.trim(),
        dateNaissance: dn,
        lieuNaissance: lieu.trim() || undefined,
        adresse: adresse.trim(),
        codePostal: cp.trim(),
        ville: ville.trim(),
        situationMatrimoniale: situation,
        contactPhone: tel.replace(/\D/g, ''),
        contactEmail: email.trim(),
        modeFinancement: financement,
        montantEmprunte: financement === 'pret' && emprunt ? Number(emprunt.replace(/\D/g, '')) : undefined,
        message: message.trim().slice(0, 500) || undefined,
      });
      setId(r.id);
      setEtape(2);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const rdv = async () => {
    if (!date || !heure || id == null) return setErr('Choisissez un jour et une heure.');
    setBusy(true);
    setErr('');
    try {
      await extranetRequete('PATCH', `/api/vefa/${id}/rdv`, { signatureDate: date, signatureTime: heure });
      setEtape(3);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Ecran basExtra={30}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}>
        <Text style={{ color: C.navy, fontWeight: '700' }}>‹ Retour</Text>
      </Pressable>
      <Text style={ui.titre}>Réserver le lot {lot.lot}</Text>
      <View style={[ui.trait, { marginBottom: 14 }]} />
      <Carte>
        <Ligne libelle="Lot" valeur={`${lot.type} · ${String(lot.surface).replace('.', ',')} m²`} />
        <Ligne libelle="Exposition" valeur={lot.expo} />
        <Ligne libelle="Prix" valeur={eur(lot.prix)} gras />
      </Carte>

      {etape === 1 ? (
        <>
          <Message texte="Cette demande de pré-réservation n’a pas de valeur contractuelle : le bon de réservation définitif est signé en personne à l’agence, au rendez-vous que vous choisirez ensuite." />
          <Choix label="Civilité" options={[['M', 'M.'], ['Mme', 'Mme']]} valeur={civ} onChange={setCiv} />
          <Champ label="Nom" valeur={nom} onChange={setNom} autoCap="words" />
          <Champ label="Prénom" valeur={prenom} onChange={setPrenom} autoCap="words" />
          <Champ label="Date de naissance (JJ/MM/AAAA)" valeur={naissance} onChange={setNaissance} clavier="numbers-and-punctuation" />
          <Champ label="Lieu de naissance" valeur={lieu} onChange={setLieu} autoCap="words" />
          <Champ label="Adresse" valeur={adresse} onChange={setAdresse} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Champ label="Code postal" valeur={cp} onChange={setCp} clavier="number-pad" />
            </View>
            <View style={{ flex: 2 }}>
              <Champ label="Ville" valeur={ville} onChange={setVille} autoCap="words" />
            </View>
          </View>
          <Choix label="Situation" options={['Célibataire', 'Marié(e)', 'Pacsé(e)', 'Divorcé(e)', 'Veuf(ve)'].map((x) => [x, x] as [string, string])} valeur={situation} onChange={setSituation} />
          <Champ label="Téléphone" valeur={tel} onChange={setTel} clavier="phone-pad" />
          <Champ label="Email" valeur={email} onChange={setEmail} clavier="email-address" autoCap="none" />
          <Choix label="Financement" options={[['pret', 'Prêt immobilier'], ['comptant', 'Comptant']]} valeur={financement} onChange={setFinancement} />
          {financement === 'pret' ? <Champ label="Montant emprunté estimé (€)" valeur={emprunt} onChange={setEmprunt} clavier="number-pad" /> : null}
          <Champ label="Message (facultatif)" valeur={message} onChange={(t) => setMessage(t.slice(0, 500))} multiligne />
          {err ? <Message type="erreur" texte={err} /> : null}
          <Bouton titre={busy ? 'Envoi…' : 'Valider et choisir un créneau'} onPress={envoyer} desactive={busy} />
        </>
      ) : etape === 2 ? (
        <>
          <Message type="ok" texte="Votre demande est enregistrée. Choisissez maintenant la date de signature à l’agence." />
          <Text style={ui.h2}>Date de signature souhaitée</Text>
          <ChoixJour jours={jours} valeur={date} onChange={setDate} />
          {date ? creneaux ? <ChoixHeure heures={creneaux.slots} valeur={heure} onChange={setHeure} prises={creneaux.busy} /> : <Chargement texte="Créneaux…" /> : null}
          {err ? <Message type="erreur" texte={err} /> : null}
          <Bouton titre={busy ? 'Réservation…' : 'Réserver ce rendez-vous'} onPress={rdv} desactive={busy || !heure} />
        </>
      ) : (
        <>
          <Message type="ok" texte={`Votre rendez-vous de signature est réservé le ${dateLongue(date)} à ${heure}, à l’agence (21 rue Sellénick, Strasbourg).`} />
          <Bouton titre="Terminer" variante="marine" onPress={() => router.back()} />
        </>
      )}
    </Ecran>
  );
}
