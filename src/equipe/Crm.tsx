import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { BarreRecherche, Champ, Choix, Feuille, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Ligne, Vide, s as ui } from '@/components/ui';
import { useDonnees } from '@/espace/commun';
import { extranetPost } from '@/lib/api';
import { dateFr } from '@/lib/format';
import { C } from '@/lib/theme';
import { Onglets, Section, contient, useAction } from './outils';

// CRM : contacts des pôles Transaction et Location (acquéreurs, vendeurs,
// locataires, propriétaires), statut, notes, nouveau contact.

type Contact = {
  id: number;
  pole: string;
  role: string;
  source: string;
  statut: string;
  nonLu: boolean;
  civilite: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  sujet: string;
  message: string;
  criteres: Record<string, any>;
  notes: string;
  historique: { at: string; by: string; texte: string }[];
  prochaineAction: string | null;
  createdAt: string;
};
const STATUTS: [string, string][] = [
  ['nouveau', 'Nouveau'],
  ['a_rappeler', 'À rappeler'],
  ['en_cours', 'En cours'],
  ['rdv', 'RDV'],
  ['offre', 'Offre'],
  ['conclu', 'Conclu'],
  ['perdu', 'Perdu'],
  ['archive', 'Archivé'],
];
const ROLES: [string, string][] = [
  ['acquereur', 'Acquéreur'],
  ['vendeur', 'Vendeur'],
  ['locataire', 'Locataire'],
  ['proprietaire', 'Propriétaire'],
];
const libStatut = (s: string) => STATUTS.find(([k]) => k === s)?.[1] || s;

export default function Crm() {
  const [pole, setPole] = useState<'transaction' | 'location'>('transaction');
  const [statut, setStatut] = useState('actifs');
  const [q, setQ] = useState('');
  const { data, erreur, chargement, charger } = useDonnees<{ contacts: Contact[] }>(`/api/crm?pole=${pole}`);
  const [c, setC] = useState<Contact | null>(null);
  const [note, setNote] = useState('');
  const [nouveau, setNouveau] = useState<Partial<Contact> | null>(null);
  const { busy, lancer } = useAction();
  const liste = (data?.contacts || []).filter((x) => (statut === 'tous' ? true : statut === 'actifs' ? !['perdu', 'archive', 'conclu'].includes(x.statut) : x.statut === statut) && contient(q, x.prenom, x.nom, x.email, x.telephone, x.sujet));

  const ouvrirContact = (x: Contact) => {
    setC(x);
    setNote('');
    if (x.nonLu) extranetPost('/api/crm', { action: 'lu', id: x.id }).catch(() => {});
  };

  return (
    <Section
      titre="CRM"
      chargement={chargement && !data}
      erreur={erreur}
      onRefresh={charger}
      action={<Bouton titre="Nouveau contact" variante="marine" onPress={() => setNouveau({ role: pole === 'transaction' ? 'acquereur' : 'locataire', statut: 'nouveau' })} style={{ marginBottom: 12 }} />}
    >
      <Onglets
        options={[
          ['transaction', 'Transaction'],
          ['location', 'Location'],
        ]}
        valeur={pole}
        onChange={setPole}
      />
      <Onglets options={[['actifs', 'Actifs'], ...STATUTS, ['tous', 'Tous']] as [string, string][]} valeur={statut} onChange={setStatut} />
      <BarreRecherche valeur={q} onChange={setQ} placeholder="Nom, email, téléphone…" />
      {data && !liste.length ? <Vide texte="Aucun contact." /> : null}
      {liste.map((x) => (
        <LigneAction
          key={x.id}
          icone={x.nonLu ? 'person-add' : 'person-outline'}
          titre={`${x.prenom} ${x.nom}`.trim() || x.email}
          sous={`${ROLES.find(([k]) => k === x.role)?.[1] || x.role} · ${libStatut(x.statut)}${x.criteres?.bienRef ? ` · réf. ${x.criteres.bienRef}` : ''} · ${dateFr(x.createdAt)}`}
          onPress={() => ouvrirContact(x)}
          droite={x.nonLu ? <Badge texte="nouveau" couleur="#fff" fond={C.danger} /> : undefined}
        />
      ))}

      <Feuille visible={!!c} titre={c ? `${c.prenom} ${c.nom}` : ''} onFermer={() => setC(null)}>
        {c ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {c.telephone ? <Bouton titre="Appeler" variante="marine" onPress={() => Linking.openURL(`tel:${c.telephone.replace(/\s/g, '')}`)} style={{ flex: 1 }} /> : null}
              {c.email ? <Bouton titre="Email" variante="contour" onPress={() => Linking.openURL(`mailto:${c.email}`)} style={{ flex: 1 }} /> : null}
            </View>
            <Carte>
              <Ligne libelle="Profil" valeur={ROLES.find(([k]) => k === c.role)?.[1] || c.role} />
              {c.email ? <Ligne libelle="Email" valeur={c.email} /> : null}
              {c.telephone ? <Ligne libelle="Téléphone" valeur={c.telephone} /> : null}
              {c.sujet ? <Ligne libelle="Sujet" valeur={c.sujet} /> : null}
              {Object.entries(c.criteres || {})
                .filter(([, v]) => v !== '' && v != null && typeof v !== 'object')
                .map(([k, v]) => (
                  <Ligne key={k} libelle={k} valeur={String(v)} />
                ))}
              <Ligne libelle="Source" valeur={c.source} />
            </Carte>
            {c.message ? <Text style={[ui.texte, { marginBottom: 12 }]}>{c.message}</Text> : null}
            <Choix
              label="Statut"
              options={STATUTS}
              valeur={c.statut}
              onChange={(v) =>
                lancer(async () => {
                  const r = await extranetPost<{ contact: Contact }>('/api/crm', { action: 'statut', id: c.id, statut: v });
                  setC(r.contact);
                  charger();
                })
              }
            />
            <Champ label="Ajouter une note" valeur={note} onChange={setNote} multiligne />
            <Bouton
              titre="Enregistrer la note"
              variante="contour"
              desactive={busy || !note.trim()}
              onPress={() =>
                lancer(async () => {
                  const r = await extranetPost<{ contact: Contact }>('/api/crm', { action: 'note', id: c.id, texte: note.trim() });
                  setC(r.contact);
                  setNote('');
                })
              }
            />
            {c.historique?.length ? <Text style={ui.h2}>Historique</Text> : null}
            {[...(c.historique || [])].reverse().map((h, i) => (
              <Text key={i} style={[ui.petit, { marginBottom: 6 }]}>
                {dateFr(h.at)} · {h.by} — {h.texte}
              </Text>
            ))}
          </>
        ) : null}
      </Feuille>

      <Feuille
        visible={!!nouveau}
        titre="Nouveau contact"
        onFermer={() => setNouveau(null)}
        pied={
          <Bouton
            titre={busy ? 'Enregistrement…' : 'Enregistrer'}
            desactive={busy}
            onPress={() =>
              nouveau &&
              lancer(async () => {
                await extranetPost('/api/crm', { action: 'enregistrer', contact: { ...nouveau, criteres: nouveau.criteres || {} } });
                setNouveau(null);
                charger();
              }, 'Contact enregistré.')
            }
            style={{ flex: 1 }}
          />
        }
      >
        {nouveau ? (
          <>
            <Choix label="Profil" options={ROLES} valeur={String(nouveau.role)} onChange={(v) => setNouveau({ ...nouveau, role: v })} />
            <Champ label="Prénom" valeur={nouveau.prenom || ''} onChange={(t) => setNouveau({ ...nouveau, prenom: t })} autoCap="words" />
            <Champ label="Nom" valeur={nouveau.nom || ''} onChange={(t) => setNouveau({ ...nouveau, nom: t })} autoCap="words" />
            <Champ label="Email" valeur={nouveau.email || ''} onChange={(t) => setNouveau({ ...nouveau, email: t })} clavier="email-address" autoCap="none" />
            <Champ label="Téléphone" valeur={nouveau.telephone || ''} onChange={(t) => setNouveau({ ...nouveau, telephone: t })} clavier="phone-pad" />
            <Champ label="Message / besoin" valeur={nouveau.message || ''} onChange={(t) => setNouveau({ ...nouveau, message: t })} multiligne />
            <Champ label="Notes" valeur={nouveau.notes || ''} onChange={(t) => setNouveau({ ...nouveau, notes: t })} multiligne />
          </>
        ) : null}
      </Feuille>
    </Section>
  );
}
