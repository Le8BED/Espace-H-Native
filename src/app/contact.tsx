import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Champ, Choix } from '@/components/form';
import { Bouton, Ecran, Message, s as ui } from '@/components/ui';
import { sitePost } from '@/lib/api';
import { AGENCE, C } from '@/lib/theme';

// Formulaire de contact (même traitement que le site : email au bon pôle et
// fiche dans l'extranet). ?sujet=…&ref=… pour préremplir.
const SUJETS: [string, string][] = [
  ['Acquéreur', 'Je cherche à acheter'],
  ['Locataire', 'Je cherche à louer'],
  ['Visite d’un bien', 'Visiter un bien'],
  ['Estimation d’un bien', 'Faire estimer mon bien'],
  ['Gestion locative', 'Confier mon bien en gestion'],
  ['Programme neuf – Les Jardins de la Sauer', 'Programme neuf (VEFA)'],
  ['Autre demande', 'Autre demande'],
];

export default function Contact() {
  const p = useLocalSearchParams<{ sujet?: string; ref?: string; message?: string }>();
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [sujet, setSujet] = useState(SUJETS.some(([v]) => v === p.sujet) ? String(p.sujet) : 'Autre demande');
  const [message, setMessage] = useState(p.message ? String(p.message) : p.ref ? `Bonjour, je souhaite des informations sur le bien réf. ${p.ref}.` : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  const envoyer = async () => {
    if (prenom.trim().length < 2 || nom.trim().length < 2) return setErr('Indiquez votre prénom et votre nom.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErr('Adresse email invalide.');
    if (tel.replace(/\D/g, '').length < 10) return setErr('Numéro de téléphone invalide (10 chiffres).');
    if (message.trim().length < 10) return setErr('Votre message est trop court.');
    setBusy(true);
    setErr('');
    try {
      await sitePost('/api/app/contact', { firstname: prenom.trim(), name: nom.trim(), email: email.trim(), phone: tel.trim(), subject: sujet, message: message.trim(), bienRef: p.ref || '', website: '' });
      setOk(true);
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
      <Text style={ui.titre}>Nous écrire</Text>
      <Text style={[ui.petit, { marginTop: 4, marginBottom: 16 }]}>
        {AGENCE.adresse} · {AGENCE.telephone}
      </Text>
      {ok ? (
        <>
          <Message type="ok" texte="Merci, votre message est bien envoyé. L’agence vous répond rapidement." />
          <Bouton titre="Retour" variante="marine" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Choix label="Votre demande" options={SUJETS.map(([v, l]) => [v, l] as [string, string])} valeur={sujet} onChange={setSujet} />
          <Champ label="Prénom" valeur={prenom} onChange={setPrenom} autoCap="words" />
          <Champ label="Nom" valeur={nom} onChange={setNom} autoCap="words" />
          <Champ label="Email" valeur={email} onChange={setEmail} clavier="email-address" autoCap="none" />
          <Champ label="Téléphone" valeur={tel} onChange={setTel} clavier="phone-pad" />
          <Champ label="Message" valeur={message} onChange={setMessage} multiligne />
          {err ? <Message type="erreur" texte={err} /> : null}
          <Bouton titre={busy ? 'Envoi…' : 'Envoyer'} onPress={envoyer} desactive={busy} />
          <Text style={[ui.petit, { marginTop: 10 }]}>Vos informations servent uniquement à répondre à votre demande.</Text>
        </>
      )}
    </Ecran>
  );
}
