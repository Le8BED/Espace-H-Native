import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { ChoixHeure, ChoixJour, ajouterJours, dateDe, dateLongue, prochainsJours } from '@/components/dates';
import { Apparition, Bandeau, BarreEtapes, BoutonsEtape, CarteChoix, Confirmation, EnteteEtape, THEMES } from '@/components/etapes';
import { Champ } from '@/components/form';
import { Carte, Ecran, Ligne, Message, s as ui } from '@/components/ui';
import { extranetGet, extranetPost } from '@/lib/api';
import { eur } from '@/lib/format';
import { SITE } from '@/lib/theme';

// Réservation MAKOMSPACE en 3 étapes (style des vidéos, couleurs MAKOMSPACE) :
// formule, créneau, coordonnées et paiement en ligne (page Stripe). Le prix
// est calculé par le serveur de l'agence (jamais par le téléphone).

type Formule = 'heure' | 'jour' | 'semaine' | 'mois';
const FORMULES: { v: Formule; titre: string; texte: string; icone: 'time-outline' | 'sunny-outline' | 'calendar-outline' | 'calendar-number-outline' }[] = [
  { v: 'heure', titre: 'À l’heure · 35 € TTC', texte: '3 heures minimum, du lundi au vendredi.', icone: 'time-outline' },
  { v: 'jour', titre: 'À la journée · 190 € TTC', texte: 'Du lundi au jeudi, en exclusivité.', icone: 'sunny-outline' },
  { v: 'semaine', titre: 'À la semaine · 790 € TTC', texte: 'Du lundi au vendredi 12h30 (week-end non compris).', icone: 'calendar-outline' },
  { v: 'mois', titre: 'Au mois · sur demande', texte: 'Décrivez votre projet : nous vous faisons une proposition.', icone: 'calendar-number-outline' },
];
const HEURES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const ETAPES = ['Formule', 'Créneau', 'Coordonnées'];
const T = 'makom' as const;

type Dispo = { occupied: Record<string, number[]>; hourlyBusy: Record<string, { start: string; end: string }[]> };

export default function ReserverMakom() {
  const [etape, setEtape] = useState(0);
  const [formule, setFormule] = useState<Formule>('heure');
  const [objet, setObjet] = useState<'reunion' | 'boutique'>('reunion');
  const [date, setDate] = useState('');
  const [fin, setFin] = useState('');
  const [debutH, setDebutH] = useState('');
  const [finH, setFinH] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [societe, setSociete] = useState('');
  const [message, setMessage] = useState('');
  const [dispo, setDispo] = useState<Dispo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fait, setFait] = useState<{ price: number; accessNotice?: string; payer: boolean } | null>(null);

  useEffect(() => {
    extranetGet<Dispo>('/api/officeflex/availability').then(setDispo).catch(() => setDispo(null));
  }, []);

  // Jours de départ selon la formule
  const jours = useMemo(() => {
    if (formule === 'heure') return prochainsJours(40, (d) => d.getDay() >= 1 && d.getDay() <= 5);
    if (formule === 'jour') return prochainsJours(40, (d) => d.getDay() >= 1 && d.getDay() <= 4, 1);
    return prochainsJours(10, (d) => d.getDay() === 1, 1); // semaine / mois : un lundi
  }, [formule]);
  const vendredis = useMemo(() => (date && formule === 'semaine' ? [0, 1, 2, 3].map((n) => ajouterJours(date, 4 + 7 * n)) : []), [date, formule]);
  const heuresJour = date && dateDe(date).getDay() === 5 ? HEURES.filter((h) => h <= '12:00') : HEURES;
  const prises = useMemo(() => {
    if (!dispo || !date) return [];
    const occ = dispo.hourlyBusy?.[date] || [];
    return HEURES.filter((h) => occ.some((o) => h >= o.start && h < o.end));
  }, [dispo, date]);

  useEffect(() => {
    if (!date) return;
    if (formule === 'semaine') setFin(ajouterJours(date, 4));
    else if (formule === 'mois') setFin(ajouterJours(date, 25));
    else if (formule === 'jour') setFin(date);
  }, [date, formule]);

  const aller = (i: number) => {
    setErr('');
    setEtape(i);
  };
  const nbSemaines = formule === 'semaine' && date && fin ? Math.round((dateDe(fin).getTime() - dateDe(date).getTime()) / (7 * 86400000)) + 1 : 1;
  const estimation = formule === 'semaine' ? `${(790 * nbSemaines).toLocaleString('fr-FR')} € TTC` : formule === 'jour' && date && fin ? `${(190 * (Math.round((dateDe(fin).getTime() - dateDe(date).getTime()) / 86400000) + 1)).toLocaleString('fr-FR')} € TTC` : formule === 'heure' && debutH && finH ? `${(35 * (Number(finH.slice(0, 2)) - Number(debutH.slice(0, 2)))).toLocaleString('fr-FR')} € TTC` : '';

  const suivant = () => {
    setErr('');
    if (etape === 1) {
      if (!date) return setErr('Choisissez une date.');
      if (formule === 'heure') {
        if (!debutH || !finH) return setErr('Choisissez l’heure de début et de fin.');
        if (Number(finH.slice(0, 2)) - Number(debutH.slice(0, 2)) < 3) return setErr('3 heures minimum.');
      }
    }
    aller(etape + 1);
  };

  const reserver = async () => {
    setErr('');
    if (!/^[A-Za-zÀ-ÿ' -]{2,}$/.test(nom.trim()) || !/^[A-Za-zÀ-ÿ' -]{2,}$/.test(prenom.trim())) return setErr('Indiquez votre nom et votre prénom (lettres uniquement).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErr('Adresse email invalide.');
    if (tel.replace(/\D/g, '').length !== 10) return setErr('Téléphone : 10 chiffres.');
    setBusy(true);
    try {
      const r = await extranetPost<{ ok: boolean; price: number; accessNotice?: string; checkoutUrl: string | null }>('/api/officeflex/reserve', {
        durationType: formule,
        purpose: objet,
        date,
        endDate: formule === 'heure' ? undefined : fin || undefined,
        startTime: formule === 'heure' ? debutH : undefined,
        endTime: formule === 'heure' ? finH : undefined,
        name: nom.trim(),
        firstname: prenom.trim(),
        email: email.trim(),
        phone: tel.replace(/\D/g, ''),
        company: societe.trim() || undefined,
        message: message.trim().slice(0, 200) || undefined,
        successUrl: `${SITE}/makomspace?paiement=succes`,
        cancelUrl: `${SITE}/makomspace?paiement=annule`,
      });
      if (r.checkoutUrl) {
        await WebBrowser.openBrowserAsync(r.checkoutUrl);
        setFait({ price: r.price, accessNotice: r.accessNotice, payer: true });
      } else setFait({ price: r.price, accessNotice: r.accessNotice, payer: false });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (fait)
    return (
      <Ecran basExtra={30} fond={THEMES[T].fond}>
        <Confirmation titre="Réservation enregistrée" theme={T}>
          <Text style={{ color: 'rgba(255,255,255,0.88)', textAlign: 'center', lineHeight: 20 }}>
            {dateLongue(date)} · {eur(fait.price)}
            {'\n'}
            {fait.payer ? 'Une fois le paiement validé, vous recevez la confirmation par email. Le créneau est gardé 30 minutes.' : 'L’agence vous contacte pour confirmer et régler la réservation.'}
          </Text>
        </Confirmation>
        {fait.accessNotice ? <Message texte={fait.accessNotice} /> : null}
        <BoutonsEtape theme={T} suivant={() => router.back()} libelle="Terminer" />
      </Ecran>
    );

  return (
    <Ecran basExtra={30} fond={THEMES[T].fond}>
      <Pressable onPress={() => (etape > 0 ? aller(etape - 1) : router.back())} style={{ marginBottom: 10 }}>
        <Text style={{ color: THEMES[T].fonce, fontWeight: '700' }}>‹ {etape > 0 ? 'Étape précédente' : 'Retour'}</Text>
      </Pressable>
      {etape === 0 ? <Bandeau theme={T} surtitre="MAKOMSPACE · en partenariat avec Agence H" titre="Un espace qui vous ressemble," italique="réservé en 3 étapes." /> : null}
      <BarreEtapes etapes={ETAPES} actuelle={etape} theme={T} onAller={aller} />

      {etape === 0 ? (
        <>
          <EnteteEtape cle={0} theme={T} surtitre="Votre formule" titre="Combien de temps" italique="vous faut-il ?" />
          {FORMULES.map((f, i) => (
            <CarteChoix
              key={f.v}
              theme={T}
              delai={i * 60}
              actif={formule === f.v}
              icone={f.icone}
              titre={f.titre}
              texte={f.texte}
              onPress={() => {
                // Au mois : sur demande -> formulaire de contact MAKOMSPACE
                if (f.v === 'mois') {
                  Linking.openURL(`${SITE}/contact?sujet=makomspace`);
                  return;
                }
                setFormule(f.v);
                setDate('');
                setFin('');
                setDebutH('');
                setFinH('');
              }}
            />
          ))}
          <Text style={[ui.lib, { marginTop: 10 }]}>Pour</Text>
          <View style={{ flexDirection: 'row', gap: 4, backgroundColor: '#10223a', borderRadius: 999, padding: 4, borderWidth: 2, borderColor: '#b8894d' }}>
            {(
              [
                ['reunion', 'Réunion / rendez-vous'],
                ['boutique', 'Boutique éphémère'],
              ] as const
            ).map(([v, l]) => (
              <Pressable key={v} onPress={() => setObjet(v)} style={{ flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: 'center', backgroundColor: objet === v ? '#d9b47a' : 'transparent' }}>
                <Text style={{ color: objet === v ? '#10223a' : '#e9dcc3', fontWeight: '800', fontSize: 13.5 }}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => Linking.openURL(`${SITE}/contact?sujet=makomspace`)} style={{ marginTop: 12 }}>
            <Text style={[ui.petit, { textDecorationLine: 'underline' }]}>Plusieurs mois, vendredi après-midi ou week-end : faire une demande</Text>
          </Pressable>
        </>
      ) : null}

      {etape === 1 ? (
        <Apparition cle={1}>
          <EnteteEtape cle={1} theme={T} surtitre="Votre créneau" titre="Choisissez" italique="votre date." texte={formule === 'semaine' || formule === 'mois' ? 'Départ un lundi.' : undefined} />
          <Text style={ui.lib}>{formule === 'heure' ? 'Jour' : 'Début'}</Text>
          <ChoixJour jours={jours} valeur={date} onChange={setDate} indisponibles={formule === 'heure' ? [] : Object.keys(dispo?.occupied || {}).filter((d) => (dispo?.occupied[d] || []).length >= 3)} />
          {formule === 'heure' && date ? (
            <>
              <Text style={ui.lib}>De</Text>
              <ChoixHeure heures={heuresJour.slice(0, -3)} valeur={debutH} onChange={setDebutH} prises={prises} />
              <Text style={ui.lib}>À</Text>
              <ChoixHeure heures={heuresJour.filter((h) => !debutH || h > debutH)} valeur={finH} onChange={setFinH} prises={[]} />
            </>
          ) : null}
          {formule === 'jour' && date ? (
            <>
              <Text style={ui.lib}>Jusqu’au (lundi au jeudi)</Text>
              <ChoixJour jours={jours.filter((j) => j >= date)} valeur={fin} onChange={setFin} />
            </>
          ) : null}
          {formule === 'semaine' && date ? (
            <>
              <Text style={ui.lib}>Sortie le vendredi (12h30)</Text>
              <ChoixJour jours={vendredis} valeur={fin} onChange={setFin} />
            </>
          ) : null}
          {formule === 'mois' && date ? <Text style={[ui.petit, { marginBottom: 12 }]}>Du {dateLongue(date)} au {dateLongue(fin)} (12h30).</Text> : null}
          {estimation ? (
            <View style={{ alignSelf: 'flex-start', backgroundColor: THEMES[T].fonce, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 6 }}>
              <Text style={{ color: THEMES[T].accent2, fontWeight: '800' }}>Estimation : {estimation}</Text>
            </View>
          ) : null}
        </Apparition>
      ) : null}

      {etape === 2 ? (
        <Apparition cle={2}>
          <EnteteEtape cle={2} theme={T} surtitre="Coordonnées et paiement" titre="Confirmé" italique="en un clic." />
          <Carte>
            <Ligne libelle="Formule" valeur={FORMULES.find((f) => f.v === formule)?.titre || formule} />
            <Ligne libelle="Date" valeur={formule === 'heure' ? `${dateLongue(date)}, ${debutH} – ${finH}` : fin && fin !== date ? `${dateLongue(date)} → ${dateLongue(fin)}` : dateLongue(date)} />
            {estimation ? <Ligne libelle="Estimation" valeur={estimation} gras /> : null}
          </Carte>
          <Champ label="Nom" valeur={nom} onChange={setNom} autoCap="words" />
          <Champ label="Prénom" valeur={prenom} onChange={setPrenom} autoCap="words" />
          <Champ label="Email" valeur={email} onChange={setEmail} clavier="email-address" autoCap="none" />
          <Champ label="Téléphone" valeur={tel} onChange={setTel} clavier="phone-pad" />
          <Champ label="Société (facultatif)" valeur={societe} onChange={setSociete} />
          <Champ label="Message (facultatif)" valeur={message} onChange={(t) => setMessage(t.slice(0, 200))} multiligne />
          <Text style={ui.petit}>Paiement sécurisé en ligne. Le montant définitif est calculé par l’agence. Sans frais d’agence, sans caution.</Text>
        </Apparition>
      ) : null}

      {err ? <Message type="erreur" texte={err} /> : null}
      <BoutonsEtape theme={T} precedent={etape > 0 ? () => aller(etape - 1) : undefined} suivant={etape < 2 ? suivant : reserver} libelle={etape < 2 ? 'Continuer' : 'Réserver et payer'} enCours={busy} />
    </Ecran>
  );
}
