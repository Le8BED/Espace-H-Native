import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Champ, Choix, Feuille } from '@/components/form';
import { Badge, Bouton, Carte, Ligne, Vide, s as ui } from '@/components/ui';
import { ouvrir, useDonnees } from '@/espace/commun';
import { extranetPost } from '@/lib/api';
import { dateFr, eur2, MOIS } from '@/lib/format';
import { C } from '@/lib/theme';
import { BarreRecherche } from '@/components/form';
import { Onglets, Section, aujourdhui, contient, plus, useAction } from './outils';

// Encaissements des loyers du mois : qui a payé, paiement à la main (payé,
// partiel, impayé), envoi des quittances. Même logique que l'extranet.

type Q = { id: string; statut: string; montant: number; numero: string | null; partiel: boolean; fichier: boolean; dateReglement: string | null; envoyeeLe: string | null; aPosterLe: string | null; compteEncaisse: string | null };
type Du = {
  tenantAccountId: string;
  name: string;
  email: string | null;
  modeEnvoi: string;
  ownerName: string;
  adresse: string;
  reference: string;
  loyerHC: number;
  charges: number;
  montantDu: number;
  paye: number;
  reste: number;
  etat: 'attendu' | 'partiel' | 'impaye' | 'regle';
  periode: { label: string; prorata: boolean; jours: number };
  quittances: Q[];
};
type Mois = { annee: number; mois: number; label: string; dues: Du[] };

const ETAT: Record<Du['etat'], [string, string, string]> = {
  regle: ['Réglé', C.ok, C.okBg],
  partiel: ['Partiel', C.warn, C.warnBg],
  impaye: ['Impayé', C.danger, C.dangerBg],
  attendu: ['Attendu', C.inkSoft, C.ground],
};
const MODES = ['Virement', 'Prélèvement', 'Chèque', 'Espèces', 'Carte bancaire'];
const COMPTES: [string, string][] = [
  ['gestion', 'Compte de gestion'],
  ['proprietaire', 'Compte du propriétaire'],
  ['agence', 'Compte de l’agence'],
];

export default function Loyers() {
  const now = new Date();
  const [an, setAn] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth() + 1);
  const [filtre, setFiltre] = useState<'tous' | Du['etat']>('tous');
  const [q, setQ] = useState('');
  const [choisi, setChoisi] = useState<Du | null>(null);
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(aujourdhui());
  const [mode, setMode] = useState('Virement');
  const [compte, setCompte] = useState('gestion');
  const [changerRib, setChangerRib] = useState(false);
  const { data, erreur, chargement, charger } = useDonnees<Mois>(`/api/gestion/encaissements?annee=${an}&mois=${mo}`);
  const { busy, lancer } = useAction();

  const dues = useMemo(() => (data?.dues || []).filter((d) => d.montantDu > 0), [data]);
  const liste = dues.filter((d) => (filtre === 'tous' || d.etat === filtre) && contient(q, d.name, d.ownerName, d.adresse));
  const nb = (e: Du['etat']) => dues.filter((d) => d.etat === e).length;
  const aEnvoyer = dues.flatMap((d) => d.quittances.filter((x) => x.statut === 'payée' && x.fichier && !x.envoyeeLe && !x.aPosterLe).map((x) => ({ tenantAccountId: d.tenantAccountId, quittanceId: x.id })));

  const changerMois = (n: number) => {
    const d = new Date(an, mo - 1 + n, 1);
    setAn(d.getFullYear());
    setMo(d.getMonth() + 1);
  };
  const ouvrirDu = (d: Du) => {
    setChoisi(d);
    setMontant(String(d.reste || d.montantDu).replace('.', ','));
    setDate(aujourdhui());
    setMode('Virement');
    setCompte('gestion');
    setChangerRib(false);
  };
  const valider = (statut: 'paye' | 'partiel' | 'impaye') => {
    if (!choisi) return;
    const m = Number(montant.replace(',', '.')) || 0;
    const st = statut === 'impaye' ? 'impaye' : m + 0.009 >= (choisi.reste || choisi.montantDu) ? 'paye' : 'partiel';
    lancer(async () => {
      const r = await extranetPost<{ results: { ok: boolean; message: string; quittanceId?: string }[] }>('/api/gestion/encaissements', {
        action: 'valider',
        annee: an,
        mois: mo,
        majReleves: true,
        paiements: [st === 'impaye' ? { tenantAccountId: choisi.tenantAccountId, statut: 'impaye' } : { tenantAccountId: choisi.tenantAccountId, statut: st, montant: montant, date, mode, compte, changerRib: compte !== 'gestion' && changerRib }],
      });
      const res = r.results?.[0];
      if (res && !res.ok) throw new Error(res.message);
      setChoisi(null);
      charger();
    }, statut === 'impaye' ? 'Impayé enregistré.' : 'Paiement enregistré, quittance éditée.');
  };

  return (
    <Section titre="Loyers du mois" chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable onPress={() => changerMois(-1)} hitSlop={12}>
          <Ionicons name="chevron-back-circle" size={34} color={C.navy} />
        </Pressable>
        <Text style={{ fontSize: 19, fontWeight: '800', color: C.ink, textTransform: 'capitalize' }}>
          {MOIS[mo - 1]} {an}
        </Text>
        <Pressable onPress={() => changerMois(1)} hitSlop={12}>
          <Ionicons name="chevron-forward-circle" size={34} color={C.navy} />
        </Pressable>
      </View>
      {data ? (
        <Carte>
          <Ligne libelle="Réglés" valeur={`${nb('regle')} / ${dues.length}`} gras />
          <Ligne libelle="Reçu" valeur={`${eur2(dues.reduce((s, d) => s + Math.min(d.paye, d.montantDu), 0))} sur ${eur2(dues.reduce((s, d) => s + d.montantDu, 0))}`} />
          {aEnvoyer.length ? (
            <Bouton
              titre={`Envoyer ${plus(aEnvoyer.length, 'quittance')}`}
              variante="marine"
              desactive={busy}
              onPress={() =>
                lancer(async () => {
                  const r = await extranetPost<{ results: { ok: boolean }[] }>('/api/gestion/encaissements', { action: 'envoyer', items: aEnvoyer });
                  charger();
                  const ko = (r.results || []).filter((x) => !x.ok).length;
                  if (ko) throw new Error(`${ko} envoi(s) impossible(s) (pas d’email ?).`);
                }, 'Quittances envoyées.')
              }
              style={{ marginTop: 12 }}
            />
          ) : null}
        </Carte>
      ) : null}
      <Onglets
        options={[
          ['tous', 'Tous'],
          ['attendu', 'Attendus', nb('attendu')],
          ['partiel', 'Partiels', nb('partiel')],
          ['impaye', 'Impayés', nb('impaye')],
          ['regle', 'Réglés'],
        ]}
        valeur={filtre}
        onChange={setFiltre}
      />
      <BarreRecherche valeur={q} onChange={setQ} placeholder="Locataire, propriétaire, adresse…" />
      {data && !liste.length ? <Vide texte="Aucun loyer." /> : null}
      {liste.map((d) => {
        const [lib, coul, fond] = ETAT[d.etat];
        return (
          <Carte key={`${d.tenantAccountId}-${d.reference}`} onPress={() => ouvrirDu(d)} style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>{d.name}</Text>
              <Text style={{ fontWeight: '800', color: C.navy }}>{eur2(d.montantDu)}</Text>
            </View>
            <Text style={ui.petit} numberOfLines={1}>
              {d.adresse} · Prop. {d.ownerName}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Badge texte={lib} couleur={coul} fond={fond} />
              {d.etat === 'partiel' ? <Badge texte={`reste ${eur2(d.reste)}`} couleur={C.warn} fond={C.warnBg} /> : null}
              {d.periode.prorata ? <Badge texte={`prorata ${d.periode.jours} j`} /> : null}
              {d.modeEnvoi !== 'email' ? <Badge texte="📮 courrier" /> : null}
            </View>
          </Carte>
        );
      })}

      <Feuille
        visible={!!choisi}
        titre={choisi?.name || ''}
        onFermer={() => setChoisi(null)}
        pied={
          choisi && choisi.etat !== 'regle' ? (
            <>
              <Bouton titre="Impayé" variante="danger" onPress={() => valider('impaye')} desactive={busy} style={{ flex: 1 }} />
              <Bouton titre={busy ? '…' : 'Encaisser'} onPress={() => valider('paye')} desactive={busy} style={{ flex: 1.6 }} />
            </>
          ) : undefined
        }
      >
        {choisi ? (
          <>
            <Carte>
              <Ligne libelle="Logement" valeur={choisi.adresse} />
              <Ligne libelle="Propriétaire" valeur={choisi.ownerName} />
              <Ligne libelle="Loyer + charges" valeur={`${eur2(choisi.loyerHC)} + ${eur2(choisi.charges)}`} />
              <Ligne libelle="Dû ce mois" valeur={eur2(choisi.montantDu)} gras />
              {choisi.paye ? <Ligne libelle="Déjà reçu" valeur={eur2(choisi.paye)} /> : null}
            </Carte>
            {choisi.quittances.length ? (
              <>
                <Text style={ui.h2}>Quittances</Text>
                {choisi.quittances.map((x) => (
                  <Carte
                    key={x.id}
                    onPress={x.fichier ? () => ouvrir(`/api/gestion/quittance-pdf?itemId=${encodeURIComponent(x.id)}&tenantAccountId=${encodeURIComponent(choisi.tenantAccountId)}`, `${x.numero || 'quittance'}.pdf`) : undefined}
                    style={{ padding: 12 }}
                  >
                    <Text style={{ fontWeight: '700', color: C.ink }}>
                      {x.numero || (x.statut === 'payée' ? 'Payée' : x.statut)} · {eur2(x.montant)}
                    </Text>
                    <Text style={ui.petit}>
                      {x.dateReglement ? `Réglée le ${dateFr(x.dateReglement)}` : x.statut}
                      {x.envoyeeLe ? ` · envoyée le ${dateFr(x.envoyeeLe)}` : x.aPosterLe ? ' · 📮 à poster' : x.fichier ? ' · pas encore envoyée' : ''}
                    </Text>
                  </Carte>
                ))}
              </>
            ) : null}
            {choisi.etat !== 'regle' ? (
              <>
                <Text style={ui.h2}>Enregistrer un paiement</Text>
                <Champ label="Montant reçu (€)" valeur={montant} onChange={setMontant} clavier="decimal-pad" aide="Moins que le dû : paiement partiel (le reste reste dû)." />
                <Champ label="Date du règlement (AAAA-MM-JJ)" valeur={date} onChange={setDate} clavier="numbers-and-punctuation" />
                <Choix label="Mode" options={MODES.map((m) => [m, m] as [string, string])} valeur={mode} onChange={setMode} />
                <Choix label="Versé sur" options={COMPTES} valeur={compte} onChange={setCompte} />
                {compte !== 'gestion' ? (
                  <Choix
                    label="Demander au locataire de changer de RIB ?"
                    options={[
                      ['oui', 'Oui, le prévenir'],
                      ['non', 'Non'],
                    ]}
                    valeur={changerRib ? 'oui' : 'non'}
                    onChange={(v) => setChangerRib(v === 'oui')}
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </Feuille>
    </Section>
  );
}
