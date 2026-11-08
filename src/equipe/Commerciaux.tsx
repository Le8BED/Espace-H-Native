import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { ChoixJour, iso, prochainsJours } from '@/components/dates';
import { Champ, Choix, Feuille, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Vide, s as ui } from '@/components/ui';
import { useDonnees } from '@/espace/commun';
import { extranetPost, extranetRequete } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateFr, eur } from '@/lib/format';
import { C } from '@/lib/theme';
import { Section, confirmer, useAction } from './outils';

// Espace des agents commerciaux et commerciaux : mandats, acquéreurs,
// planning, transactions. Chaque ajout / modification / suppression est une
// demande validée par l'administration (comme sur l'extranet).
// Réservation de salle (profil « salle »).

type Champs = { k: string; label: string; type?: 'texte' | 'nombre' | 'date' | 'heure' | 'long'; options?: string[] }[];
const ENTITES: Record<string, { titre: string; icone: any; champs: Champs; titreItem: (x: any) => string; sous: (x: any) => string }> = {
  biens: {
    titre: 'Mandats',
    icone: 'home-outline',
    champs: [
      { k: 'adresse', label: 'Adresse' },
      { k: 'type', label: 'Type', options: ['vente', 'location'] },
      { k: 'statut', label: 'Statut', options: ['mandat en cours', 'vendu', 'loué', 'retiré'] },
      { k: 'prix', label: 'Prix (€)', type: 'nombre' },
      { k: 'dateMandat', label: 'Date du mandat (AAAA-MM-JJ)', type: 'date' },
    ],
    titreItem: (x) => x.adresse || 'Mandat',
    sous: (x) => `${x.type || ''} · ${x.statut || ''}${x.prix ? ` · ${eur(Number(x.prix))}` : ''}${x.dateMandat ? ` · ${dateFr(x.dateMandat)}` : ''}`,
  },
  acquereurs: {
    titre: 'Acquéreurs',
    icone: 'people-outline',
    champs: [
      { k: 'nom', label: 'Nom' },
      { k: 'contact', label: 'Téléphone / email' },
      { k: 'budgetMax', label: 'Budget max (€)', type: 'nombre' },
      { k: 'apport', label: 'Apport (€)', type: 'nombre' },
      { k: 'accordBancaire', label: 'Accord bancaire', options: ['oui', 'non', 'en cours'] },
      { k: 'secteur', label: 'Secteur' },
      { k: 'typeBien', label: 'Type de bien' },
      { k: 'nbPieces', label: 'Pièces', type: 'nombre' },
      { k: 'statut', label: 'Statut', options: ['nouveau', 'recherche active', 'offre faite', 'sous compromis', 'perdu'] },
      { k: 'bienInteret', label: 'Bien qui l’intéresse' },
      { k: 'notes', label: 'Notes', type: 'long' },
    ],
    titreItem: (x) => x.nom || 'Acquéreur',
    sous: (x) => `${x.statut || ''}${x.budgetMax ? ` · ${eur(Number(x.budgetMax))}` : ''}${x.secteur ? ` · ${x.secteur}` : ''}`,
  },
  planning: {
    titre: 'Planning',
    icone: 'calendar-outline',
    champs: [
      { k: 'date', label: 'Date (AAAA-MM-JJ)', type: 'date' },
      { k: 'heure', label: 'Heure (HH:MM)', type: 'heure' },
      { k: 'type', label: 'Type', options: ['visite', 'signature', 'appel', 'rdv agence', 'autre'] },
      { k: 'avec', label: 'Avec' },
      { k: 'bien', label: 'Bien' },
      { k: 'lieu', label: 'Lieu' },
      { k: 'notes', label: 'Notes', type: 'long' },
    ],
    titreItem: (x) => `${x.date ? dateFr(x.date) : ''} ${x.heure || ''} · ${x.type || ''}`,
    sous: (x) => [x.avec, x.bien, x.lieu].filter(Boolean).join(' · '),
  },
  transactions: {
    titre: 'Transactions',
    icone: 'swap-horizontal-outline',
    champs: [
      { k: 'bien', label: 'Bien' },
      { k: 'vendeur', label: 'Vendeur' },
      { k: 'acquereur', label: 'Acquéreur' },
      { k: 'prixVente', label: 'Prix de vente (€)', type: 'nombre' },
      { k: 'statut', label: 'Statut', options: ['offre reçue', 'compromis signé', 'acte signé', 'commission versée'] },
      { k: 'tauxCommissionPct', label: 'Commission (%)', type: 'nombre' },
      { k: 'montantCommission', label: 'Montant commission (€)', type: 'nombre' },
      { k: 'dateOffre', label: 'Date de l’offre', type: 'date' },
      { k: 'dateCompromis', label: 'Date du compromis', type: 'date' },
      { k: 'dateActe', label: 'Date de l’acte', type: 'date' },
    ],
    titreItem: (x) => x.bien || 'Transaction',
    sous: (x) => `${x.statut || ''}${x.prixVente ? ` · ${eur(Number(x.prixVente))}` : ''}`,
  },
};

export function DonneesAgent({ entite }: { entite: keyof typeof ENTITES }) {
  const { profile, rafraichir } = useAuth();
  const def = ENTITES[entite];
  const items: any[] = (profile?.[entite] || []) as any[];
  const [form, setForm] = useState<{ itemId?: string; valeurs: Record<string, string> } | null>(null);
  const { busy, lancer } = useAction();
  const envoyer = (action: 'create' | 'update' | 'delete', itemId?: string, payload?: Record<string, unknown>) =>
    lancer(async () => {
      await extranetPost('/api/change-requests', { action, entityType: entite, entityRef: itemId ? { itemId } : undefined, payload: payload || {} });
      setForm(null);
      rafraichir();
    }, 'Demande envoyée à l’administration pour validation.');

  return (
    <Section titre={def.titre} onRefresh={rafraichir} action={<Bouton titre="Ajouter" variante="marine" onPress={() => setForm({ valeurs: {} })} style={{ marginBottom: 12 }} />}>
      {!items.length ? <Vide texte="Rien pour le moment." /> : null}
      {items.map((x, i) => (
        <LigneAction key={x.id || i} icone={def.icone} titre={def.titreItem(x)} sous={def.sous(x)} onPress={() => setForm({ itemId: x.id || `idx-${i}`, valeurs: Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v == null ? '' : String(v)])) })} />
      ))}
      <Text style={[ui.petit, { marginTop: 10 }]}>Les ajouts et modifications sont validés par l’administration avant d’apparaître ici (voir « Mes demandes »).</Text>
      <Feuille
        visible={!!form}
        titre={form?.itemId ? 'Modifier' : 'Ajouter'}
        onFermer={() => setForm(null)}
        pied={
          form ? (
            <>
              {form.itemId ? <Bouton titre="Supprimer" variante="danger" onPress={() => confirmer('Supprimer', 'Demander la suppression ?', () => envoyer('delete', form.itemId))} style={{ flex: 1 }} /> : null}
              <Bouton
                titre={busy ? '…' : 'Envoyer'}
                desactive={busy}
                onPress={() => {
                  const payload: Record<string, unknown> = {};
                  let invalide = '';
                  def.champs.forEach((c) => {
                    const v = (form.valeurs[c.k] || '').trim();
                    if (v === '') return;
                    if (c.type === 'nombre') {
                      const n = Number(v.replace(/[^\d,.-]/g, '').replace(',', '.'));
                      if (!Number.isFinite(n)) invalide = c.label;
                      else payload[c.k] = n;
                    } else payload[c.k] = v;
                  });
                  if (invalide) return Alert.alert('Valeur invalide', `Vérifiez le champ « ${invalide} » (un nombre est attendu).`);
                  envoyer(form.itemId ? 'update' : 'create', form.itemId, payload);
                }}
                style={{ flex: 1.4 }}
              />
            </>
          ) : undefined
        }
      >
        {form
          ? def.champs.map((c) =>
              c.options ? (
                <Choix key={c.k} label={c.label} options={c.options.map((o) => [o, o] as [string, string])} valeur={form.valeurs[c.k] || ''} onChange={(v) => setForm({ ...form, valeurs: { ...form.valeurs, [c.k]: v } })} />
              ) : (
                <Champ
                  key={c.k}
                  label={c.label}
                  valeur={form.valeurs[c.k] || ''}
                  onChange={(t) => setForm({ ...form, valeurs: { ...form.valeurs, [c.k]: t } })}
                  clavier={c.type === 'nombre' ? 'decimal-pad' : c.type === 'date' || c.type === 'heure' ? 'numbers-and-punctuation' : 'default'}
                  multiligne={c.type === 'long'}
                />
              )
            )
          : null}
      </Feuille>
    </Section>
  );
}

// ---------------- SALLE ----------------
const CRENEAUX = ['Matin (9h-12h)', 'Après-midi (14h-17h)', 'Soirée (18h-21h)'];
type Resa = { id: string; date: string; slot: number; label: string; paid: boolean; accountId: string; accountName: string };
export function Salle() {
  const { user } = useAuth();
  const { data, erreur, chargement, charger } = useDonnees<{ reservations: Resa[] }>('/api/reservations');
  const jours = prochainsJours(30, () => true);
  const [date, setDate] = useState(jours[0]);
  const [slot, setSlot] = useState('0');
  const [label, setLabel] = useState('');
  const { busy, lancer } = useAction();
  // La date arrive parfois en horodatage (ex. 2026-10-11T22:00:00.000Z) : on la ramène au jour local
  const resas = (data?.reservations || []).map((r) => ({ ...r, date: String(r.date).length > 10 ? iso(new Date(r.date)) : String(r.date) }));
  const prises = resas.filter((r) => r.date === date).map((r) => r.slot);
  const avenir = resas.filter((r) => r.date >= jours[0]).sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot);
  return (
    <Section titre="Réservation de salle" chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      <Carte>
        <Text style={ui.lib}>Jour</Text>
        <ChoixJour jours={jours} valeur={date} onChange={setDate} />
        <Choix label="Créneau" options={CRENEAUX.map((c, i) => [String(i), prises.includes(i) ? `${c} — pris` : c] as [string, string])} valeur={slot} onChange={setSlot} />
        <Champ label="Objet" valeur={label} onChange={setLabel} placeholder="Réunion, formation…" />
        <Bouton
          titre={busy ? '…' : 'Réserver'}
          desactive={busy || prises.includes(Number(slot))}
          onPress={() => lancer(async () => {
            await extranetPost('/api/reservations', { date, slot: Number(slot), label: label || 'Réservation' });
            setLabel('');
            charger();
          }, 'Créneau réservé.')}
        />
      </Carte>
      <Text style={ui.h2}>À venir</Text>
      {!avenir.length ? <Vide texte="Aucune réservation à venir." /> : null}
      {avenir.map((r) => (
        <Carte key={r.id} style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>
              {dateFr(r.date)} · {CRENEAUX[r.slot]}
            </Text>
            {r.paid ? <Badge texte="Payée" couleur={C.ok} fond={C.okBg} /> : null}
          </View>
          <Text style={ui.petit}>
            {r.label} · {r.accountName}
          </Text>
          {String(r.accountId) === String(user?.id) ? <Bouton titre="Annuler" variante="danger" onPress={() => confirmer('Annuler', 'Annuler cette réservation ?', () => lancer(() => extranetRequete('DELETE', `/api/reservations/${r.id}`).then(charger)), 'Annuler', true)} style={{ marginTop: 8 }} /> : null}
        </Carte>
      ))}
    </Section>
  );
}
