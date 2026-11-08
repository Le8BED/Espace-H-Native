import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { BarreRecherche, Champ, Choix, Feuille, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Ligne, Vide, s as ui } from '@/components/ui';
import { ouvrir, useDonnees } from '@/espace/commun';
import { extranetPost, extranetPostForm, extranetRequete } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { choisirDocument, pourFormData, prendrePhoto, type FichierJoint } from '@/lib/fichiers';
import { dateFr, eur2 } from '@/lib/format';
import { C } from '@/lib/theme';
import { Onglets, Section, confirmer, contient, useAction } from './outils';

// Comptes, documents des clients, demandes des commerciaux, contrats,
// courriers à poster.

const ROLES: Record<string, string> = { admin: 'Admin', locataire: 'Locataire', proprietaire: 'Propriétaire', domiciliation: 'Domiciliation', salle: 'Salle', agent_commercial: 'Agent commercial', commercial: 'Commercial' };

// ---------------- COMPTES ----------------
type Compte = { id: string; name: string; email: string | null; login: string | null; role: string; createdAt: string };
export function Comptes() {
  const { data, erreur, chargement, charger } = useDonnees<{ accounts: Compte[] }>('/api/accounts');
  const [role, setRole] = useState('tous');
  const [q, setQ] = useState('');
  const [nouveau, setNouveau] = useState<{ name: string; email: string; password: string; role: string; adresse: string } | null>(null);
  const [cree, setCree] = useState<{ login: string; password: string } | null>(null);
  const { busy, lancer } = useAction();
  const liste = (data?.accounts || []).filter((a) => (role === 'tous' || a.role === role) && contient(q, a.name, a.email, a.login));
  const genererMdp = () => Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 8) + '!7';
  return (
    <Section
      titre="Comptes"
      chargement={chargement && !data}
      erreur={erreur}
      onRefresh={charger}
      action={<Bouton titre="Créer un compte" variante="marine" onPress={() => setNouveau({ name: '', email: '', password: genererMdp(), role: 'locataire', adresse: '' })} style={{ marginBottom: 12 }} />}
    >
      <Onglets options={[['tous', 'Tous'], ...Object.entries(ROLES)] as [string, string][]} valeur={role} onChange={setRole} />
      <BarreRecherche valeur={q} onChange={setQ} placeholder="Nom, email, identifiant…" />
      {liste.map((a) => (
        <LigneAction
          key={a.id}
          icone="person-circle-outline"
          titre={a.name}
          sous={`${ROLES[a.role] || a.role} · ${a.login || a.email || ''} · créé le ${dateFr(a.createdAt)}`}
          onPress={() =>
            Alert.alert(a.name, `${ROLES[a.role] || a.role}\nIdentifiant : ${a.login || a.email || '—'}`, [
              { text: 'Fermer', style: 'cancel' },
              ...(a.login || a.email ? [{ text: 'Envoyer un lien de mot de passe', onPress: () => lancer(() => extranetPost('/api/auth/mot-de-passe-oublie', { identifiant: a.login || a.email }), 'Lien de réinitialisation envoyé par email (valable 1 heure).') }] : []),
              ...(a.role !== 'admin' ? [{ text: 'Supprimer le compte', style: 'destructive' as const, onPress: () => confirmer('Supprimer', `Supprimer définitivement le compte de ${a.name} ?`, () => lancer(() => extranetRequete('DELETE', `/api/accounts/${a.id}`).then(charger)), 'Supprimer', true) }] : []),
            ])
          }
        />
      ))}
      {data && !liste.length ? <Vide texte="Aucun compte." /> : null}
      <Feuille
        visible={!!nouveau}
        titre="Nouveau compte"
        onFermer={() => setNouveau(null)}
        pied={
          <Bouton
            titre={busy ? '…' : 'Créer'}
            desactive={busy || !nouveau?.name || (nouveau?.password || '').length < 8}
            onPress={() =>
              nouveau &&
              lancer(async () => {
                const r = await extranetPost<{ login: string }>('/api/accounts', { ...nouveau, email: nouveau.email || undefined });
                setCree({ login: r.login, password: nouveau.password });
                setNouveau(null);
                charger();
              })
            }
            style={{ flex: 1 }}
          />
        }
      >
        {nouveau ? (
          <>
            <Choix label="Profil" options={(['locataire', 'proprietaire', 'domiciliation', 'agent_commercial', 'commercial'] as string[]).map((r) => [r, ROLES[r]] as [string, string])} valeur={nouveau.role} onChange={(v) => setNouveau({ ...nouveau, role: v })} />
            <Champ label="Nom" valeur={nouveau.name} onChange={(t) => setNouveau({ ...nouveau, name: t })} autoCap="words" />
            <Champ label="Email (facultatif)" valeur={nouveau.email} onChange={(t) => setNouveau({ ...nouveau, email: t })} clavier="email-address" autoCap="none" />
            {nouveau.role === 'locataire' ? <Champ label="Adresse du logement" valeur={nouveau.adresse} onChange={(t) => setNouveau({ ...nouveau, adresse: t })} /> : null}
            <Champ label="Mot de passe provisoire (8 caractères min.)" valeur={nouveau.password} onChange={(t) => setNouveau({ ...nouveau, password: t })} autoCap="none" aide="Communiquez-le au client de vive voix ou par un canal sûr." />
          </>
        ) : null}
      </Feuille>
      <Feuille visible={!!cree} titre="Compte créé" onFermer={() => setCree(null)}>
        {cree ? (
          <Carte>
            <Ligne libelle="Identifiant" valeur={cree.login} gras />
            <Ligne libelle="Mot de passe provisoire" valeur={cree.password} />
            <Text style={[ui.petit, { marginTop: 8 }]}>Notez ces informations maintenant : le mot de passe ne sera plus affiché.</Text>
          </Carte>
        ) : null}
      </Feuille>
    </Section>
  );
}

// ---------------- DOCUMENTS DES CLIENTS ----------------
export function DocumentsAdmin() {
  const comptes = useDonnees<{ accounts: { id: string; name: string; role: string; documentCount: number }[] }>('/api/documents/admin');
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const docs = useDonnees<{ documents: any[] }>(client ? `/api/documents/admin?accountId=${encodeURIComponent(client.id)}` : null);
  const [q, setQ] = useState('');
  const [f, setF] = useState<FichierJoint | null>(null);
  const [label, setLabel] = useState('');
  const { busy, lancer } = useAction();
  const prendre = async (photo: boolean) => {
    try {
      const x = photo ? await prendrePhoto() : await choisirDocument();
      if (x) setF(x);
    } catch (e) {
      Alert.alert('Fichier', (e as Error).message);
    }
  };
  if (client)
    return (
      <Section titre={client.name} sous="Documents" chargement={docs.chargement && !docs.data} erreur={docs.erreur} onRefresh={docs.charger}>
        <Bouton titre="‹ Tous les clients" variante="contour" onPress={() => setClient(null)} style={{ alignSelf: 'flex-start', marginBottom: 12 }} />
        <Carte>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Bouton titre="Photo" variante="contour" onPress={() => prendre(true)} style={{ flex: 1 }} />
            <Bouton titre="Fichier" variante="contour" onPress={() => prendre(false)} style={{ flex: 1 }} />
          </View>
          {f ? (
            <>
              <Text style={[ui.petit, { marginVertical: 8 }]}>📎 {f.filename}</Text>
              <Champ label="Intitulé" valeur={label} onChange={setLabel} />
              <Bouton
                titre={busy ? 'Envoi…' : 'Déposer dans son espace'}
                desactive={busy}
                onPress={() =>
                  lancer(async () => {
                    const fd = new FormData();
                    fd.append('accountId', client.id);
                    fd.append('label', label || f.filename);
                    fd.append('category', 'autre');
                    fd.append('file', pourFormData(f));
                    await extranetPostForm('/api/documents/admin/upload', fd);
                    setF(null);
                    setLabel('');
                    docs.charger();
                  }, 'Document déposé.')
                }
              />
            </>
          ) : null}
        </Carte>
        {(docs.data?.documents || []).map((d) => (
          <LigneAction
            key={d.id}
            icone="document-text-outline"
            titre={d.label || d.filename}
            sous={`${d.category} · ${dateFr(d.createdAt)} · ${d.direction === 'client_agence' ? 'du client' : 'de l’agence'}`}
            onPress={() => ouvrir(`/api/documents/download?id=${d.id}`, d.filename)}
            droite={<Bouton titre="🗑" variante="contour" onPress={() => confirmer('Supprimer', `Supprimer « ${d.label || d.filename} » ?`, () => lancer(() => extranetRequete('DELETE', `/api/documents/admin/${d.id}`).then(docs.charger)), 'Supprimer', true)} />}
          />
        ))}
      </Section>
    );
  return (
    <Section titre="Documents des clients" chargement={comptes.chargement && !comptes.data} erreur={comptes.erreur} onRefresh={comptes.charger}>
      <BarreRecherche valeur={q} onChange={setQ} />
      {(comptes.data?.accounts || [])
        .filter((a) => contient(q, a.name))
        .map((a) => (
          <LigneAction key={a.id} icone="folder-outline" titre={a.name} sous={`${ROLES[a.role] || a.role} · ${a.documentCount} document(s)`} onPress={() => setClient(a)} />
        ))}
    </Section>
  );
}

// ---------------- DEMANDES (commerciaux / agents) ----------------
type Demande = { id: number; requestedByName: string; action: string; entityType: string; payload: Record<string, any>; status: string; note: string | null; createdAt: string };
const ENTITES: Record<string, string> = { biens: 'Mandat', acquereurs: 'Acquéreur', planning: 'Planning', transactions: 'Transaction', owner_property: 'Lot', tenant_bail: 'Bail', tenant_quittance: 'Quittance', registre_mandat: 'Registre des mandats', tenant_garant: 'Garant' };
const ACTIONS: Record<string, string> = { create: 'Ajout', update: 'Modification', delete: 'Suppression' };
export function Demandes() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const { data, erreur, chargement, charger } = useDonnees<{ requests: Demande[] }>('/api/change-requests');
  const [filtre, setFiltre] = useState<'pending' | 'tous'>('pending');
  const { lancer } = useAction();
  const liste = (data?.requests || []).filter((r) => filtre === 'tous' || r.status === 'pending');
  const decider = (r: Demande, decision: 'approuvé' | 'refusé') => lancer(() => extranetRequete('PATCH', `/api/change-requests/${r.id}`, { decision }).then(charger), decision === 'approuvé' ? 'Demande approuvée et appliquée.' : 'Demande refusée.');
  return (
    <Section titre={admin ? 'Demandes à valider' : 'Mes demandes'} chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      <Onglets
        options={[
          ['pending', 'En attente', (data?.requests || []).filter((r) => r.status === 'pending').length],
          ['tous', 'Toutes'],
        ]}
        valeur={filtre}
        onChange={setFiltre}
      />
      {data && !liste.length ? <Vide texte="Aucune demande." /> : null}
      {liste.map((r) => (
        <Carte key={r.id}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>
              {ACTIONS[r.action] || r.action} · {ENTITES[r.entityType] || r.entityType}
            </Text>
            <Badge texte={r.status === 'pending' ? 'En attente' : r.status} couleur={r.status === 'approuvé' ? C.ok : r.status === 'refusé' ? C.danger : C.warn} fond={r.status === 'approuvé' ? C.okBg : r.status === 'refusé' ? C.dangerBg : C.warnBg} />
          </View>
          <Text style={ui.petit}>
            {admin ? `${r.requestedByName} · ` : ''}
            {dateFr(r.createdAt)}
          </Text>
          {Object.entries(r.payload || {})
            .filter(([, v]) => v !== '' && v != null && typeof v !== 'object')
            .slice(0, 8)
            .map(([k, v]) => (
              <Ligne key={k} libelle={k} valeur={String(v)} />
            ))}
          {r.note ? <Text style={[ui.petit, { marginTop: 6 }]}>Note : {r.note}</Text> : null}
          {admin && r.status === 'pending' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Bouton titre="Refuser" variante="danger" onPress={() => decider(r, 'refusé')} style={{ flex: 1 }} />
              <Bouton titre="Approuver" onPress={() => decider(r, 'approuvé')} style={{ flex: 1 }} />
            </View>
          ) : null}
        </Carte>
      ))}
    </Section>
  );
}

// ---------------- CONTRATS ----------------
type Contrat = { id: number; categoryLabel: string; typeLabel: string; relatedTo: string; status: string; createdByName: string; createdAt: string; numeroRegistre: string | null };
const STATUT_C: Record<string, string> = { brouillon: 'Brouillon', en_attente_signature: 'En attente de signature', signe: 'Signé', annule: 'Annulé', enregistré: 'Enregistré' };
export function Contrats() {
  const { data, erreur, chargement, charger } = useDonnees<{ contracts: Contrat[] }>('/api/contracts');
  const [q, setQ] = useState('');
  return (
    <Section titre="Contrats" chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      <BarreRecherche valeur={q} onChange={setQ} />
      {(data?.contracts || [])
        .filter((c) => contient(q, c.typeLabel, c.relatedTo, c.categoryLabel))
        .map((c) => (
          <LigneAction
            key={c.id}
            icone={c.status === 'signe' ? 'checkmark-done-outline' : 'document-outline'}
            titre={`${c.typeLabel}${c.relatedTo ? ` · ${c.relatedTo}` : ''}`}
            sous={`${c.categoryLabel} · ${STATUT_C[c.status] || c.status} · ${dateFr(c.createdAt)}${c.numeroRegistre ? ` · n° ${c.numeroRegistre}` : ''}`}
            onPress={() => ouvrir(`/api/contracts/${c.id}/pdf`, `contrat-${c.id}.pdf`)}
          />
        ))}
      {data && !data.contracts.length ? <Vide texte="Aucun contrat." /> : null}
      <Text style={[ui.petit, { marginTop: 10 }]}>La rédaction des contrats se fait sur ordinateur ; ici, vous les consultez et les partagez en PDF.</Text>
    </Section>
  );
}

// ---------------- COURRIERS À POSTER ----------------
type Aposter = { tenantAccountId: string; name: string; adresse: string; type: 'quittance' | 'relance'; id: string; libelle: string; montant: number; date: string };
export function Courriers() {
  const { data, erreur, chargement, charger } = useDonnees<{ items: Aposter[] }>('/api/gestion/courriers');
  const { lancer } = useAction();
  return (
    <Section titre="Courriers à poster" sous="Locataires qui reçoivent leurs documents par la poste" chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      {data && !data.items.length ? <Vide texte="Rien à poster." /> : null}
      {(data?.items || []).map((it) => (
        <Carte key={`${it.tenantAccountId}-${it.type}-${it.id}`}>
          <Text style={{ fontWeight: '800', color: C.ink }}>{it.name}</Text>
          <Text style={ui.petit}>{it.adresse || 'adresse à compléter'}</Text>
          <Text style={[ui.texte, { marginTop: 4 }]}>
            {it.libelle}
            {it.montant ? ` · ${eur2(it.montant)}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {it.type === 'quittance' ? <Bouton titre="PDF" variante="contour" onPress={() => ouvrir(`/api/gestion/quittance-pdf?itemId=${encodeURIComponent(it.id)}&tenantAccountId=${encodeURIComponent(it.tenantAccountId)}`, `quittance-${it.name}.pdf`)} style={{ flex: 1 }} /> : null}
            <Bouton titre="✓ Posté" onPress={() => lancer(() => extranetPost('/api/gestion/courriers', { action: 'poste', tenantAccountId: it.tenantAccountId, type: it.type, id: it.id }).then(charger))} style={{ flex: 1 }} />
          </View>
        </Carte>
      ))}
    </Section>
  );
}
