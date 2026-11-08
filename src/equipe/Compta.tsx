import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Champ, Choix, Feuille } from '@/components/form';
import { Badge, Bouton, Carte, Ligne, Vide, s as ui } from '@/components/ui';
import { ouvrir, useDonnees } from '@/espace/commun';
import { extranetPost } from '@/lib/api';
import { choisirDocument, prendrePhoto } from '@/lib/fichiers';
import { dateFr, eur2, MOIS } from '@/lib/format';
import { C } from '@/lib/theme';
import { Onglets, Section, contient, useAction } from './outils';
import { BarreRecherche } from '@/components/form';

// Comptabilité de l'agence : lignes du relevé bancaire du mois, catégorie
// (code couleur), justification (facture photographiée ou PDF, ou « sans
// facture »).

type Op = { id: number; date: string; libelle: string; tiers: string; categorie: string; montant: number; statut: 'a_justifier' | 'justifie' | 'sans_facture'; note: string; facture: { id: number; numero: string; tiers: string; ttc: number; fichier: string | null } | null };

const CATS: [string, string, string][] = [
  ['loyer', 'Loyer encaissé', '#2e7d46'],
  ['loyer_local', 'Loyer du local', '#0f766e'],
  ['honoraires', 'Honoraires / ventes', '#1c4f8a'],
  ['reversement', 'Reversement propriétaire', '#6b3fa0'],
  ['fournisseur', 'Fournisseur / achat', '#8a5a2b'],
  ['logiciel', 'Logiciel / internet', '#4338ca'],
  ['telecom', 'Téléphone / internet', '#0e7490'],
  ['energie', 'Énergie', '#d97706'],
  ['assurance', 'Assurance', '#be185d'],
  ['banque', 'Frais bancaires', '#6b7280'],
  ['frais_compta', 'Frais comptables', '#e0b400'],
  ['social', 'URSSAF / social', '#b91c1c'],
  ['impots', 'Impôts / taxes', '#7f1d1d'],
  ['salaire', 'Salaires', '#4d7c0f'],
  ['deplacement', 'Déplacements', '#334155'],
  ['travaux', 'Travaux / artisans', '#92400e'],
  ['virement_interne', 'Virement entre comptes', '#9ca3af'],
  ['autre', 'Autre', '#d1d5db'],
];
const couleur = (k: string) => CATS.find((c) => c[0] === k)?.[2] || '#d1d5db';

export default function Compta() {
  const now = new Date();
  const [an, setAn] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth() + 1);
  const [filtre, setFiltre] = useState<'tous' | 'a_justifier'>('a_justifier');
  const [q, setQ] = useState('');
  const { data, erreur, chargement, charger } = useDonnees<{ operations: Op[] }>(`/api/compta?operations=1&annee=${an}&mois=${mo}`);
  const [op, setOp] = useState<Op | null>(null);
  const [numero, setNumero] = useState('');
  const [ttc, setTtc] = useState('');
  const [note, setNote] = useState('');
  const { busy, lancer } = useAction();
  const ops = data?.operations || [];
  const liste = ops.filter((o) => (filtre === 'tous' || o.statut === 'a_justifier') && contient(q, o.tiers, o.libelle));
  const aJustifier = ops.filter((o) => o.statut === 'a_justifier').length;
  const totaux = useMemo(() => ({ credit: ops.filter((o) => o.montant > 0).reduce((s, o) => s + o.montant, 0), debit: ops.filter((o) => o.montant < 0).reduce((s, o) => s - o.montant, 0) }), [ops]);

  const changerMois = (n: number) => {
    const d = new Date(an, mo - 1 + n, 1);
    setAn(d.getFullYear());
    setMo(d.getMonth() + 1);
  };
  const maj = (o: Op, champs: Record<string, unknown>) => lancer(() => extranetPost('/api/compta', { action: 'operation', id: o.id, ...champs }).then(() => charger()));
  const joindre = async (photo: boolean) => {
    if (!op) return;
    try {
      const f = photo ? await prendrePhoto() : await choisirDocument();
      if (!f) return;
      const ok = await lancer(
        () =>
          extranetPost('/api/compta', {
            action: 'joindre',
            id: op.id,
            tiers: op.tiers,
            numero: numero || `${op.tiers}-${op.date}`,
            date: op.date,
            ttc: ttc ? Number(ttc.replace(',', '.')) : Math.abs(op.montant),
            objet: op.libelle,
            fichier: { filename: f.filename, contentType: f.contentType, data: f.data },
          }),
        'Facture jointe : la ligne est justifiée.'
      );
      if (ok) {
        setOp(null);
        charger();
      }
    } catch (e) {
      Alert.alert('Fichier', (e as Error).message);
    }
  };

  return (
    <Section titre="Comptabilité" sous="Relevé bancaire de l’agence" chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
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
          <Ligne libelle="Entrées" valeur={`+ ${eur2(totaux.credit)}`} />
          <Ligne libelle="Sorties" valeur={`− ${eur2(totaux.debit)}`} />
          <Ligne libelle="À justifier" valeur={`${aJustifier} ligne(s)`} gras />
        </Carte>
      ) : null}
      <Onglets
        options={[
          ['a_justifier', 'À justifier', aJustifier],
          ['tous', 'Toutes les lignes'],
        ]}
        valeur={filtre}
        onChange={setFiltre}
      />
      <BarreRecherche valeur={q} onChange={setQ} placeholder="Société, libellé…" />
      {data && !ops.length ? <Vide texte="Aucune ligne : le relevé de ce mois n’est pas encore importé (import depuis l’ordinateur)." /> : null}
      {liste.map((o) => (
        <Carte
          key={o.id}
          onPress={() => {
            setOp(o);
            setNumero('');
            setTtc(String(Math.abs(o.montant)).replace('.', ','));
            setNote(o.note || '');
          }}
          style={{ padding: 12, borderLeftWidth: 6, borderLeftColor: couleur(o.categorie), backgroundColor: o.statut === 'a_justifier' ? C.surface : '#f6faf6' }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }} numberOfLines={1}>
              {o.tiers || o.libelle}
            </Text>
            <Text style={{ fontWeight: '800', color: o.montant < 0 ? C.danger : C.ok }}>{o.montant < 0 ? `− ${eur2(-o.montant)}` : `+ ${eur2(o.montant)}`}</Text>
          </View>
          <Text style={ui.petit} numberOfLines={1}>
            {dateFr(o.date)} · {CATS.find((c) => c[0] === o.categorie)?.[1] || o.categorie}
          </Text>
          <View style={{ marginTop: 6 }}>
            {o.statut === 'justifie' ? <Badge texte={`✓ ${o.facture?.numero || 'facture'}`} couleur={C.ok} fond={C.okBg} /> : o.statut === 'sans_facture' ? <Badge texte="Sans facture" couleur={C.inkSoft} fond={C.ground} /> : <Badge texte="À justifier" couleur={C.warn} fond={C.warnBg} />}
          </View>
        </Carte>
      ))}

      <Feuille visible={!!op} titre={op?.tiers || op?.libelle || ''} onFermer={() => setOp(null)}>
        {op ? (
          <>
            <Carte>
              <Ligne libelle="Date" valeur={dateFr(op.date)} />
              <Ligne libelle="Montant" valeur={eur2(op.montant)} gras />
              <Text style={[ui.petit, { marginTop: 6 }]}>{op.libelle}</Text>
            </Carte>
            <Choix
              label="Catégorie"
              options={CATS.map(([k, l]) => [k, l] as [string, string])}
              valeur={op.categorie}
              onChange={async (v) => {
                await maj(op, { categorie: v });
                setOp({ ...op, categorie: v });
              }}
            />
            {op.facture ? (
              <>
                <Text style={ui.h2}>Facture</Text>
                <Carte>
                  <Ligne libelle="Numéro" valeur={op.facture.numero} />
                  <Ligne libelle="Montant TTC" valeur={eur2(op.facture.ttc)} />
                  {op.facture.fichier ? <Bouton titre="Voir la facture" variante="contour" onPress={() => ouvrir(`/api/compta?fichier=facture&id=${op.facture!.id}`, `${op.facture!.numero}.pdf`)} style={{ marginTop: 10 }} /> : null}
                  <Bouton titre="Délier la facture" variante="danger" onPress={() => lancer(() => extranetPost('/api/compta', { action: 'delier', id: op.id }).then(() => { setOp(null); charger(); }))} style={{ marginTop: 8 }} />
                </Carte>
              </>
            ) : (
              <>
                <Text style={ui.h2}>Justifier</Text>
                <Champ label="N° de facture (facultatif)" valeur={numero} onChange={setNumero} />
                <Champ label="Montant TTC (€)" valeur={ttc} onChange={setTtc} clavier="decimal-pad" />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <Bouton titre="Photographier" variante="marine" onPress={() => joindre(true)} desactive={busy} style={{ flex: 1 }} />
                  <Bouton titre="Fichier PDF" variante="contour" onPress={() => joindre(false)} desactive={busy} style={{ flex: 1 }} />
                </View>
                <Champ label="Ou : sans facture, pourquoi ?" valeur={note} onChange={setNote} placeholder="Frais bancaires, virement interne…" />
                <Bouton
                  titre="Marquer « sans facture »"
                  variante="contour"
                  desactive={busy || !note.trim()}
                  onPress={async () => {
                    await maj(op, { statut: 'sans_facture', note: note.trim() });
                    setOp(null);
                  }}
                />
                {op.statut === 'sans_facture' ? <Bouton titre="Remettre « à justifier »" variante="contour" onPress={async () => { await maj(op, { statut: 'a_justifier' }); setOp(null); }} style={{ marginTop: 8 }} /> : null}
              </>
            )}
          </>
        ) : null}
      </Feuille>
    </Section>
  );
}
