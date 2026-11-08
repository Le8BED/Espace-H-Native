import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Bouton, Carte, Chargement, Ecran, Ligne, Message, Vide, s as ui } from '@/components/ui';
import { extranetPostForm } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateFr, eur2, MOIS } from '@/lib/format';
import { C } from '@/lib/theme';
import { BarreEspace, CarteSyndic, Documents, EnteteEspace, MesInformations, ouvrir, Paiement, useDonnees, type Onglet } from './commun';

// Espace locataire natif : Logement · Quittances · Paiement · Documents · Menu
// (Messages, Syndic, Mes informations).

type Quittance = { id: string; periode: string; annee?: number; mois?: number; montant: number; statut?: string; numero?: string; dateReglement?: string; partiel?: boolean; horsExtranet?: boolean; nomFichier?: string };

const ONGLETS: Onglet[] = [
  { key: 'logement', label: 'Logement', icone: 'home-outline' },
  { key: 'quittances', label: 'Quittances', icone: 'receipt-outline' },
  { key: 'paiement', label: 'Paiement', icone: 'card-outline' },
  { key: 'documents', label: 'Documents', icone: 'folder-outline' },
];
const MENU: Onglet[] = [
  { key: 'messages', label: 'Messages', icone: 'chatbubbles-outline' },
  { key: 'syndic', label: 'Syndic', icone: 'business-outline' },
  { key: 'infos', label: 'Mes infos', icone: 'person-outline' },
];

const impayee = (q: Quittance) => !!q.statut && q.statut !== 'payée';

function Logement({ p, aller }: { p: any; aller: (k: string) => void }) {
  const { rafraichir } = useAuth();
  const [busy, setBusy] = useState(false);
  const quittances: Quittance[] = p?.quittances || [];
  const du = quittances.filter(impayee).reduce((s, q) => s + Number(q.montant || 0), 0);
  const total = Number(p?.loyerHC || 0) + Number(p?.chargesProvision || 0);
  const maintenant = new Date();
  const ceMois = quittances.filter((q) => q.annee === maintenant.getFullYear() && q.mois === maintenant.getMonth() + 1);
  const payeMois = ceMois.some((q) => q.statut === 'payée') && !ceMois.some(impayee);

  const recharger = async () => {
    setBusy(true);
    await rafraichir();
    setBusy(false);
  };

  return (
    <Ecran onRefresh={recharger} refreshing={busy} basExtra={150}>
      <EnteteEspace titre="Mon logement" sous={p?.adresse} />
      <Carte style={{ backgroundColor: du > 0 ? C.dangerBg : payeMois ? C.okBg : C.warnBg, borderColor: 'transparent' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name={du > 0 ? 'alert-circle' : payeMois ? 'checkmark-circle' : 'time'} size={34} color={du > 0 ? C.danger : payeMois ? C.ok : C.warn} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 17, color: C.ink }}>
              {du > 0 ? `${eur2(du)} à régler` : payeMois ? `Loyer de ${MOIS[maintenant.getMonth()]} réglé` : `Loyer de ${MOIS[maintenant.getMonth()]} en attente`}
            </Text>
            <Text style={ui.petit}>{du > 0 ? 'Merci de régulariser au plus vite, ou contactez l’agence.' : payeMois ? 'Merci ! Votre quittance est disponible.' : 'Le loyer est à régler en début de mois.'}</Text>
          </View>
        </View>
        {du > 0 ? <Bouton titre="Voir les coordonnées de paiement" variante="marine" onPress={() => aller('paiement')} style={{ marginTop: 12 }} /> : null}
      </Carte>

      <Text style={ui.h2}>Mon loyer</Text>
      <Carte>
        <Ligne libelle="Loyer hors charges" valeur={eur2(p?.loyerHC)} />
        <Ligne libelle="Provision pour charges" valeur={eur2(p?.chargesProvision)} />
        <Ligne libelle="Total mensuel" valeur={eur2(total)} gras />
        {p?.typeBail ? <Ligne libelle="Bail" valeur={p.typeBail} /> : null}
        {p?.bail?.dateEffet ? <Ligne libelle="Depuis le" valeur={dateFr(p.bail.dateEffet)} /> : null}
        {p?.lotCopro ? <Ligne libelle="Lot de copropriété" valeur={p.lotCopro} /> : null}
        {p?.caution?.montant ? <Ligne libelle="Dépôt de garantie" valeur={eur2(p.caution.montant)} /> : null}
        {p?.dateReevaluationLoyer ? <Ligne libelle="Révision du loyer" valeur={dateFr(p.dateReevaluationLoyer)} /> : null}
      </Carte>
      {(p?.colocataires || []).length ? (
        <>
          <Text style={ui.h2}>Colocataires</Text>
          <Carte>
            {(p.colocataires as any[]).map((c, i) => (
              <Ligne key={i} libelle={typeof c === 'string' ? c : c.nom} valeur={typeof c === 'string' ? '' : c.email || ''} />
            ))}
          </Carte>
        </>
      ) : null}
      <Bouton titre="Mes quittances" variante="contour" onPress={() => aller('quittances')} />
    </Ecran>
  );
}

function Quittances({ p }: { p: any }) {
  const quittances: Quittance[] = useMemo(
    () => [...(p?.quittances || [])].sort((a: Quittance, b: Quittance) => (b.annee || 0) - (a.annee || 0) || (b.mois || 0) - (a.mois || 0)),
    [p]
  );
  const [ouvre, setOuvre] = useState('');
  const telecharger = async (q: Quittance) => {
    setOuvre(q.id);
    await ouvrir(`/api/gestion/quittance-pdf?itemId=${encodeURIComponent(q.id)}`, q.nomFichier || `Quittance-${q.periode}.pdf`);
    setOuvre('');
  };
  return (
    <Ecran basExtra={150}>
      <EnteteEspace titre="Quittances" sous="Touchez une quittance pour l’ouvrir ou la partager" />
      {!quittances.length ? <Vide texte="Aucune quittance pour le moment." /> : null}
      {quittances.map((q) => {
        const due = impayee(q);
        const pdf = !!q.id && !q.horsExtranet && !due;
        return (
          <Carte key={q.id || q.periode} onPress={pdf ? () => telecharger(q) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <View style={[st.icone, { backgroundColor: due ? C.dangerBg : C.okBg }]}>
              <Ionicons name={due ? 'alert' : 'checkmark'} size={22} color={due ? C.danger : C.ok} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15.5, textTransform: 'capitalize' }}>{q.periode}</Text>
              <Text style={ui.petit}>
                {due ? 'À régler' : q.partiel ? 'Reçu de paiement partiel' : 'Payée'}
                {q.dateReglement ? ` · le ${dateFr(q.dateReglement)}` : ''}
                {q.numero ? ` · ${q.numero}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontWeight: '800', color: due ? C.danger : C.navy }}>{eur2(q.montant)}</Text>
              {pdf ? ouvre === q.id ? <ActivityIndicator color={C.brass} /> : <Ionicons name="download-outline" size={20} color={C.inkSoft} /> : null}
            </View>
          </Carte>
        );
      })}
    </Ecran>
  );
}

type Msg = { id: string; from: 'locataire' | 'agence'; authorName: string; subject?: string; body: string; urgent?: boolean; createdAt: string; attachment?: { documentId: number; label: string } | null };
function Messages() {
  const { data, erreur, chargement, charger } = useDonnees<{ messages: Msg[] }>('/api/gestion/messages');
  const [texte, setTexte] = useState('');
  const [sujet, setSujet] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const envoyer = async () => {
    if (!texte.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('subject', sujet);
      fd.append('body', texte);
      fd.append('urgent', urgent ? 'true' : 'false');
      await extranetPostForm('/api/gestion/messages', fd);
      setTexte('');
      setSujet('');
      setUrgent(false);
      charger();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const msgs = [...(data?.messages || [])].reverse();
  return (
    <Ecran onRefresh={charger} refreshing={chargement && !!data} basExtra={150}>
      <EnteteEspace titre="Messages" sous="Échangez avec le pôle gestion de l’agence" />
      <Carte>
        <TextInput value={sujet} onChangeText={setSujet} placeholder="Objet (facultatif)" placeholderTextColor="#9aa3ae" style={st.champ} />
        <TextInput value={texte} onChangeText={setTexte} placeholder="Votre message…" placeholderTextColor="#9aa3ae" multiline style={[st.champ, { minHeight: 90, textAlignVertical: 'top' }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Switch value={urgent} onValueChange={setUrgent} trackColor={{ true: C.danger }} />
            <Text style={ui.petit}>Urgent</Text>
          </View>
          <Bouton titre={busy ? 'Envoi…' : 'Envoyer'} onPress={envoyer} desactive={busy || !texte.trim()} />
        </View>
        {err ? <Message type="erreur" texte={err} /> : null}
      </Carte>
      {erreur ? <Message type="erreur" texte={erreur} /> : null}
      {chargement && !data ? <Chargement /> : null}
      {data && !msgs.length ? <Vide texte="Aucun message pour le moment." /> : null}
      {msgs.map((m) => (
        <View key={m.id} style={[st.bulle, m.from === 'locataire' ? st.bulleMoi : st.bulleAgence]}>
          <Text style={[st.bulleAuteur, m.from === 'locataire' && { color: C.brassLight }]}>
            {m.from === 'locataire' ? 'Vous' : m.authorName || 'Agence'} · {dateFr(m.createdAt)}
            {m.urgent ? ' · URGENT' : ''}
          </Text>
          {m.subject ? <Text style={[st.bulleSujet, m.from === 'locataire' && { color: '#fff' }]}>{m.subject}</Text> : null}
          <Text style={[ui.texte, m.from === 'locataire' && { color: '#fff' }]}>{m.body}</Text>
          {m.attachment ? (
            <Pressable onPress={() => ouvrir(`/api/documents/download?id=${m.attachment!.documentId}`, m.attachment!.label || 'piece-jointe')}>
              <Text style={{ marginTop: 6, fontWeight: '700', color: m.from === 'locataire' ? C.brassLight : C.brass }}>📎 {m.attachment.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </Ecran>
  );
}

export default function Locataire() {
  const { user, profile } = useAuth();
  const [onglet, setOnglet] = useState('logement');
  const p = profile || {};
  let ecran;
  if (onglet === 'quittances') ecran = <Quittances p={p} />;
  else if (onglet === 'paiement') ecran = <Paiement libelle={`Loyer ${user?.name || ''}`.trim()} />;
  else if (onglet === 'documents') ecran = <Documents />;
  else if (onglet === 'messages') ecran = <Messages />;
  else if (onglet === 'infos') ecran = <MesInformations />;
  else if (onglet === 'syndic')
    ecran = (
      <Ecran basExtra={150}>
        <EnteteEspace titre="Syndic" sous="Copropriété de votre logement" />
        <CarteSyndic syndic={p.syndic} adresse={p.adresse} />
      </Ecran>
    );
  else ecran = <Logement p={p} aller={setOnglet} />;
  return (
    <View style={{ flex: 1 }}>
      {ecran}
      <BarreEspace onglets={ONGLETS} actif={onglet} onChoisir={setOnglet} menu={MENU} />
    </View>
  );
}

const st = StyleSheet.create({
  icone: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  champ: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: C.ink, marginBottom: 8 },
  bulle: { borderRadius: 18, padding: 12, marginBottom: 10, maxWidth: '92%' },
  bulleMoi: { backgroundColor: C.navy, alignSelf: 'flex-end' },
  bulleAgence: { backgroundColor: C.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.line },
  bulleAuteur: { fontSize: 11.5, fontWeight: '700', color: C.brass, marginBottom: 4 },
  bulleSujet: { fontWeight: '800', color: C.ink, marginBottom: 2 },
});
