import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { BarreRecherche, Champ, Choix, Feuille, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Chargement, Ligne, Message, Vide, s as ui } from '@/components/ui';
import { ouvrir, useDonnees } from '@/espace/commun';
import { extranetPost, extranetPostForm } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { choisirDocument, pourFormData, prendrePhoto, type FichierJoint } from '@/lib/fichiers';
import { dateFr, eur2 } from '@/lib/format';
import { C } from '@/lib/theme';
import { Onglets, Section, contient, useAction } from './outils';

// Gestion locative : propriétaires → lots → locataire (fiche, quittances,
// messages, documents). L'admin modifie ; le commercial consulte.

type Tenant = { accountId: string; name: string; email: string; adresse: string; loyerHC: number; chargesProvision: number; typeBail: string | null; quittances: any[]; bail: any; relances: any[] };
type Lot = { itemId: string; adresse: string; reference?: string; loyerHC: number; charges: number; honorairesPct?: number; statut?: string; locataires?: string[] | string; tenant: Tenant | null; lotCopro?: string };
type Owner = { ownerAccountId: string; ownerName: string; profileId: string; properties: Lot[] };

const CATS: [string, string][] = [
  ['bail', 'Bail'],
  ['etat_lieux', 'État des lieux'],
  ['assurance', 'Assurance'],
  ['quittance_collective', 'Quittance'],
  ['identite', 'Identité'],
  ['rib', 'RIB'],
  ['justificatifs', 'Justificatifs'],
  ['caf', 'CAF'],
  ['garant', 'Garant'],
  ['autre', 'Autre'],
];

function Locataire({ t, retour }: { t: Tenant; retour: () => void }) {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [vue, setVue] = useState<'fiche' | 'quittances' | 'messages' | 'documents'>('fiche');
  const fiche = useDonnees<{ fiche: any }>(admin ? `/api/gestion/fiche?accountId=${encodeURIComponent(t.accountId)}` : null);
  const msgs = useDonnees<{ messages: any[] }>(vue === 'messages' ? `/api/gestion/messages?tenantAccountId=${encodeURIComponent(t.accountId)}` : null);
  const docs = useDonnees<{ documents: any[] }>(vue === 'documents' ? `/api/documents/admin?accountId=${encodeURIComponent(t.accountId)}` : null);
  const [texte, setTexte] = useState('');
  const [sujet, setSujet] = useState('');
  const [fichier, setFichier] = useState<FichierJoint | null>(null);
  const [label, setLabel] = useState('');
  const [cat, setCat] = useState('autre');
  const { busy, lancer } = useAction();
  const c = fiche.data?.fiche?.coordonnees || {};
  const quittances = [...(t.quittances || [])].sort((a, b) => (b.annee || 0) - (a.annee || 0) || (b.mois || 0) - (a.mois || 0));

  const envoyerMsg = () =>
    lancer(async () => {
      const fd = new FormData();
      fd.append('tenantAccountId', t.accountId);
      fd.append('subject', sujet);
      fd.append('body', texte);
      await extranetPostForm('/api/gestion/messages', fd);
      setTexte('');
      setSujet('');
      msgs.charger();
    });
  const deposer = () =>
    fichier &&
    lancer(async () => {
      const fd = new FormData();
      fd.append('accountId', t.accountId);
      fd.append('label', label || fichier.filename);
      fd.append('category', cat);
      fd.append('file', pourFormData(fichier));
      await extranetPostForm('/api/documents/admin/upload', fd);
      setFichier(null);
      setLabel('');
      docs.charger();
    }, 'Document déposé dans l’espace du locataire.');
  const choisir = async (photo: boolean) => {
    try {
      const f = photo ? await prendrePhoto() : await choisirDocument();
      if (f) setFichier(f);
    } catch (e) {
      Alert.alert('Fichier', (e as Error).message);
    }
  };

  return (
    <View>
      <Pressable onPress={retour} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="chevron-back" size={22} color={C.navy} />
        <Text style={{ color: C.navy, fontWeight: '700' }}>Retour</Text>
      </Pressable>
      <Text style={ui.titre}>{t.name}</Text>
      <Text style={[ui.petit, { marginBottom: 12 }]}>{t.adresse}</Text>
      <Onglets
        options={[
          ['fiche', 'Fiche'],
          ['quittances', 'Quittances'],
          ['messages', 'Messages'],
          ['documents', 'Documents'],
        ]}
        valeur={vue}
        onChange={setVue}
      />
      {vue === 'fiche' ? (
        <Carte>
          <Ligne libelle="Loyer HC" valeur={eur2(t.loyerHC)} />
          <Ligne libelle="Charges" valeur={eur2(t.chargesProvision)} />
          {t.typeBail ? <Ligne libelle="Bail" valeur={t.typeBail} /> : null}
          {t.bail?.dateEffet ? <Ligne libelle="Depuis le" valeur={dateFr(t.bail.dateEffet)} /> : null}
          <Ligne libelle="Email" valeur={t.email} />
          {c.telephone ? <Ligne libelle="Téléphone" valeur={c.telephone} /> : null}
          {c.adressePostale ? <Ligne libelle="Adresse postale" valeur={c.adressePostale} /> : null}
          {c.modeEnvoi ? <Ligne libelle="Envoi des quittances" valeur={c.modeEnvoi === 'courrier' ? 'Courrier postal' : 'Email + courrier'} /> : null}
          {c.notes ? <Text style={[ui.petit, { marginTop: 8 }]}>{c.notes}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {c.telephone ? <Bouton titre="Appeler" variante="marine" onPress={() => Linking.openURL(`tel:${String(c.telephone).replace(/\s/g, '')}`)} style={{ flex: 1 }} /> : null}
            {t.email ? <Bouton titre="Email" variante="contour" onPress={() => Linking.openURL(`mailto:${t.email}`)} style={{ flex: 1 }} /> : null}
          </View>
        </Carte>
      ) : null}
      {vue === 'quittances' ? (
        <>
          {!quittances.length ? <Vide texte="Aucune quittance." /> : null}
          {quittances.map((q) => {
            const due = !!q.statut && q.statut !== 'payée';
            return (
              <Carte
                key={q.id || q.periode}
                onPress={!due && q.id ? () => ouvrir(`/api/gestion/quittance-pdf?itemId=${encodeURIComponent(q.id)}&tenantAccountId=${encodeURIComponent(t.accountId)}`, q.nomFichier || `Quittance-${q.periode}.pdf`) : undefined}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}
              >
                <Ionicons name={due ? 'alert-circle' : 'checkmark-circle'} size={24} color={due ? C.danger : C.ok} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: C.ink, textTransform: 'capitalize' }}>{q.periode}</Text>
                  <Text style={ui.petit}>{q.numero || (due ? 'À régler' : '')}</Text>
                </View>
                <Text style={{ fontWeight: '800', color: due ? C.danger : C.navy }}>{eur2(q.montant)}</Text>
              </Carte>
            );
          })}
        </>
      ) : null}
      {vue === 'messages' ? (
        <>
          {admin ? (
            <Carte>
              <Champ label="Objet" valeur={sujet} onChange={setSujet} />
              <Champ label="Message au locataire" valeur={texte} onChange={setTexte} multiligne />
              <Bouton titre={busy ? 'Envoi…' : 'Envoyer'} onPress={envoyerMsg} desactive={busy || !texte.trim()} />
            </Carte>
          ) : null}
          {msgs.chargement ? <Chargement /> : null}
          {[...(msgs.data?.messages || [])].reverse().map((m) => (
            <Carte key={m.id} style={{ padding: 12, backgroundColor: m.from === 'agence' ? '#eef3fa' : C.surface }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.brass }}>
                {m.from === 'agence' ? `Agence · ${m.authorName || ''}` : t.name} · {dateFr(m.createdAt)}
                {m.urgent ? ' · URGENT' : ''}
              </Text>
              {m.subject ? <Text style={{ fontWeight: '800', color: C.ink }}>{m.subject}</Text> : null}
              <Text style={ui.texte}>{m.body}</Text>
              {m.attachment ? (
                <Pressable onPress={() => ouvrir(`/api/documents/download?id=${m.attachment.documentId}`, m.attachment.label || 'piece-jointe')}>
                  <Text style={{ color: C.brass, fontWeight: '700', marginTop: 4 }}>📎 {m.attachment.label}</Text>
                </Pressable>
              ) : null}
            </Carte>
          ))}
          {msgs.data && !msgs.data.messages.length ? <Vide texte="Aucun message." /> : null}
        </>
      ) : null}
      {vue === 'documents' ? (
        <>
          <Carte>
            <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 8 }}>Déposer un document</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Bouton titre="Photo" variante="contour" onPress={() => choisir(true)} style={{ flex: 1 }} />
              <Bouton titre="Fichier" variante="contour" onPress={() => choisir(false)} style={{ flex: 1 }} />
            </View>
            {fichier ? (
              <>
                <Text style={[ui.petit, { marginVertical: 8 }]}>📎 {fichier.filename}</Text>
                <Champ label="Intitulé" valeur={label} onChange={setLabel} />
                <Choix label="Catégorie" options={CATS} valeur={cat} onChange={setCat} defiler />
                <Bouton titre={busy ? 'Envoi…' : 'Déposer'} onPress={deposer} desactive={busy} />
              </>
            ) : null}
          </Carte>
          {docs.chargement ? <Chargement /> : null}
          {(docs.data?.documents || []).map((d) => (
            <LigneAction key={d.id} icone="document-text-outline" titre={d.label || d.filename} sous={`${d.category} · ${dateFr(d.createdAt)} · ${d.direction === 'client_agence' ? 'du locataire' : 'de l’agence'}`} onPress={() => ouvrir(`/api/documents/download?id=${d.id}`, d.filename)} />
          ))}
        </>
      ) : null}
    </View>
  );
}

export default function Gestion() {
  const { data, erreur, chargement, charger } = useDonnees<{ owners: Owner[] }>('/api/gestion');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState<Owner | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const owners = (data?.owners || []).filter((o) => contient(q, o.ownerName, ...o.properties.map((p) => `${p.adresse} ${p.tenant?.name || ''}`)));

  if (tenant)
    return (
      <Section titre="Locataire" onRefresh={charger}>
        <Locataire t={tenant} retour={() => setTenant(null)} />
      </Section>
    );

  if (owner)
    return (
      <Section titre={owner.ownerName} sous={`${owner.properties.length} lot(s)`} onRefresh={charger}>
        <Pressable onPress={() => setOwner(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="chevron-back" size={22} color={C.navy} />
          <Text style={{ color: C.navy, fontWeight: '700' }}>Propriétaires</Text>
        </Pressable>
        {owner.properties.map((p) => {
          const du = (p.tenant?.quittances || []).filter((x: any) => x.statut && x.statut !== 'payée').reduce((s: number, x: any) => s + Number(x.montant || 0), 0);
          return (
            <Carte key={p.itemId} onPress={p.tenant ? () => setTenant(p.tenant) : undefined}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>{p.adresse}</Text>
                {du > 0 ? <Badge texte={`${eur2(du)} dû`} couleur={C.danger} fond={C.dangerBg} /> : <Badge texte={p.tenant ? 'Loué' : 'Vacant'} couleur={p.tenant ? C.ok : C.inkSoft} fond={p.tenant ? C.okBg : C.ground} />}
              </View>
              <Text style={ui.petit}>
                {p.tenant ? p.tenant.name : 'Pas de locataire'} · {eur2(p.loyerHC)} + {eur2(p.charges)}
                {p.honorairesPct != null ? ` · honoraires ${p.honorairesPct} %` : ''}
              </Text>
            </Carte>
          );
        })}
      </Section>
    );

  return (
    <Section titre="Gestion locative" sous={data ? `${data.owners.length} propriétaires` : undefined} chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      <BarreRecherche valeur={q} onChange={setQ} placeholder="Propriétaire, locataire, adresse…" />
      {owners.map((o) => {
        const loues = o.properties.filter((p) => p.tenant).length;
        const du = o.properties.reduce((s, p) => s + (p.tenant?.quittances || []).filter((x: any) => x.statut && x.statut !== 'payée').reduce((a: number, x: any) => a + Number(x.montant || 0), 0), 0);
        return (
          <LigneAction
            key={o.ownerAccountId}
            icone="person-outline"
            titre={o.ownerName}
            sous={`${o.properties.length} lot(s) · ${loues} loué(s)${du > 0 ? ` · ${eur2(du)} d’impayés` : ''}`}
            onPress={() => setOwner(o)}
          />
        );
      })}
      {data && !owners.length ? <Message texte="Aucun résultat." /> : null}
    </Section>
  );
}
