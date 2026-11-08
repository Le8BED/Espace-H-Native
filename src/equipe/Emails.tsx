import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Champ, Feuille, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Ligne, Vide, s as ui } from '@/components/ui';
import { ouvrir, useDonnees } from '@/espace/commun';
import { extranetPost } from '@/lib/api';
import { dateFr } from '@/lib/format';
import { C } from '@/lib/theme';
import { Onglets, Section, useAction } from './outils';

// Emails reçus dans les boîtes de l'agence (gestion, transaction,
// domiciliation, contact, perso) : lecture, réponse, classement ; nouveau
// message.

type Email = {
  id: number;
  mailbox: string;
  receivedAt: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  senderType: string;
  accountName: string | null;
  tenantName: string | null;
  status: string;
  rubriqueLabel: string | null;
  attachments: { index: number; filename: string; size: number; documentId: number | null; skipped?: boolean }[];
  replies: { at: string; by: string; text?: string }[];
};
type Boite = { key: string; label: string; address: string; configured: boolean };

export default function Emails() {
  const [boite, setBoite] = useState('gestion');
  const [statut, setStatut] = useState<'a_traiter' | 'classes' | 'tous'>('a_traiter');
  const { data, erreur, chargement, charger } = useDonnees<{ emails: Email[]; mailboxes: Boite[]; counts: Record<string, Record<string, number>> }>(`/api/inbox?mailbox=${boite}&status=${statut}`);
  const [lu, setLu] = useState<Email | null>(null);
  const [reponse, setReponse] = useState('');
  const [nouveau, setNouveau] = useState(false);
  const [a, setA] = useState('');
  const [objet, setObjet] = useState('');
  const [corps, setCorps] = useState('');
  const { busy, lancer } = useAction();
  const boites = data?.mailboxes || [];
  const total = (k: string) => {
    const c = data?.counts?.[k] || {};
    return (c.a_valider || 0) + (c.non_identifie || 0) + (c.a_repondre || 0) + (c.a_traiter || 0);
  };

  return (
    <Section
      titre="Emails"
      chargement={chargement && !data}
      erreur={erreur}
      onRefresh={charger}
      action={<Bouton titre="Nouveau message" variante="marine" onPress={() => setNouveau(true)} style={{ marginBottom: 12 }} />}
    >
      <Onglets options={(boites.length ? boites : [{ key: 'gestion', label: 'Gestion' } as Boite]).map((b) => [b.key, b.label, total(b.key)] as [string, string, number])} valeur={boite} onChange={setBoite} />
      <Onglets
        options={[
          ['a_traiter', 'À traiter'],
          ['classes', 'Traités'],
          ['tous', 'Tous'],
        ]}
        valeur={statut}
        onChange={setStatut}
      />
      {data && !data.emails.length ? <Vide texte="Aucun email." /> : null}
      {(data?.emails || []).map((e) => (
        <LigneAction
          key={e.id}
          icone={e.attachments.length ? 'attach' : 'mail-outline'}
          titre={`${e.fromName || e.fromEmail}${e.tenantName || e.accountName ? ` · ${e.tenantName || e.accountName}` : ''}`}
          sous={`${e.subject || '(sans objet)'} · ${dateFr(e.receivedAt)}`}
          onPress={() => {
            setLu(e);
            setReponse('');
          }}
        />
      ))}

      <Feuille
        visible={!!lu}
        titre={lu?.subject || '(sans objet)'}
        onFermer={() => setLu(null)}
        pied={
          lu ? (
            <>
              <Bouton
                titre="Traité"
                variante="contour"
                desactive={busy}
                onPress={() =>
                  lancer(async () => {
                    // Boîte gestion : les emails se classent (pas de « marquer traité »)
                    await extranetPost('/api/inbox', lu.mailbox === 'gestion' ? { action: 'classer-autre', id: lu.id, precision: 'Traité depuis l’application' } : { action: 'marquer-traite', id: lu.id });
                    setLu(null);
                    charger();
                  })
                }
                style={{ flex: 1 }}
              />
              <Bouton
                titre={busy ? 'Envoi…' : 'Répondre'}
                desactive={busy || !reponse.trim()}
                onPress={() =>
                  lancer(async () => {
                    await extranetPost('/api/inbox', { action: 'repondre', id: lu.id, subject: lu.subject?.startsWith('Re') ? lu.subject : `Re : ${lu.subject || ''}`, text: reponse.trim(), markDone: true, fromMailbox: lu.mailbox });
                    setLu(null);
                    charger();
                  }, 'Réponse envoyée.')
                }
                style={{ flex: 1.4 }}
              />
            </>
          ) : undefined
        }
      >
        {lu ? (
          <>
            <Carte>
              <Ligne libelle="De" valeur={`${lu.fromName || ''} <${lu.fromEmail}>`} />
              <Ligne libelle="Reçu le" valeur={dateFr(lu.receivedAt)} />
              {lu.tenantName || lu.accountName ? <Ligne libelle="Client" valeur={lu.tenantName || lu.accountName || ''} /> : null}
              {lu.rubriqueLabel ? <Ligne libelle="Rubrique" valeur={lu.rubriqueLabel} /> : null}
            </Carte>
            <Text style={[ui.texte, { marginBottom: 12 }]}>{lu.body}</Text>
            {lu.attachments.map((p) => (
              <Pressable
                key={p.index}
                onPress={() => ouvrir(p.documentId ? `/api/documents/download?id=${p.documentId}` : `/api/inbox/attachment?id=${lu.id}&i=${p.index}`, p.filename)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
              >
                <Ionicons name="attach" size={18} color={C.brass} />
                <Text style={{ color: C.navy, fontWeight: '700', flex: 1 }}>{p.filename}</Text>
                {p.documentId ? <Badge texte="classé" couleur={C.ok} fond={C.okBg} /> : null}
              </Pressable>
            ))}
            {lu.replies.length ? <Text style={[ui.petit, { marginVertical: 8 }]}>Déjà répondu {lu.replies.length} fois (dernière le {dateFr(lu.replies[lu.replies.length - 1].at)}).</Text> : null}
            <View style={{ marginTop: 10 }}>
              <Champ label="Votre réponse" valeur={reponse} onChange={setReponse} multiligne />
            </View>
          </>
        ) : null}
      </Feuille>

      <Feuille
        visible={nouveau}
        titre="Nouveau message"
        onFermer={() => setNouveau(false)}
        pied={
          <Bouton
            titre={busy ? 'Envoi…' : 'Envoyer'}
            desactive={busy || !a.trim() || !objet.trim()}
            onPress={() =>
              lancer(async () => {
                await extranetPost('/api/inbox/envoyer', { mailbox: boite, to: a.trim(), subject: objet.trim(), text: corps, attachments: [] });
                setNouveau(false);
                setA('');
                setObjet('');
                setCorps('');
              }, 'Message envoyé.')
            }
            style={{ flex: 1 }}
          />
        }
      >
        <Text style={[ui.petit, { marginBottom: 10 }]}>Envoyé depuis la boîte « {boites.find((b) => b.key === boite)?.label || boite} ».</Text>
        <Champ label="À (emails séparés par des virgules)" valeur={a} onChange={setA} clavier="email-address" autoCap="none" />
        <Champ label="Objet" valeur={objet} onChange={setObjet} />
        <Champ label="Message" valeur={corps} onChange={setCorps} multiligne />
      </Feuille>
    </Section>
  );
}
