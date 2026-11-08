import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Bouton, Carte, Chargement, Ecran, Ligne, Message, Vide, s as ui } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { dateFr, eur, eur2, MOIS } from '@/lib/format';
import { C } from '@/lib/theme';
import { Apparition } from '@/components/etapes';
import { BarreEspace, CarteSyndic, Documents, EnteteEspace, MesInformations, ouvrir, Paiement, useDonnees, type Onglet } from './commun';

// Espace propriétaire natif : Tableau · Biens · Relevés · Documents · Menu
// (Travaux, Syndic, Paiement, Mes informations).

const ONGLETS: Onglet[] = [
  { key: 'tableau', label: 'Tableau', icone: 'stats-chart-outline' },
  { key: 'biens', label: 'Mes biens', icone: 'home-outline' },
  { key: 'releve', label: 'Relevés', icone: 'wallet-outline' },
  { key: 'documents', label: 'Documents', icone: 'folder-outline' },
];
const MENU: Onglet[] = [
  { key: 'travaux', label: 'Travaux', icone: 'construct-outline' },
  { key: 'syndic', label: 'Syndic', icone: 'business-outline' },
  { key: 'paiement', label: 'Paiement', icone: 'card-outline' },
  { key: 'infos', label: 'Mes infos', icone: 'person-outline' },
];

type Lot = { itemId: string; adresse: string; reference?: string; loyerHC: number; charges: number; statut?: string; locataires?: string[] | string; tenantAccountId?: string | null; impaye?: number; honorairesPct?: number; syndic?: any; lotCopro?: string };
type Suivi = {
  loyers: { mois: string; encaisse: number; du: number }[];
  travaux: { reference: string; titre: string; logement: string; statut: string; etape: number; etapes: number; libelle: string; montant: number; depuis: string; majLe: string }[];
  logementsLoues: number;
  lots: number;
  reversement: { aRecevoir: number; dernier?: any } | null;
};

const locs = (l: Lot) => (Array.isArray(l.locataires) ? l.locataires.join(', ') : l.locataires || '');

function Tableau({ lots, aller }: { lots: Lot[]; aller: (k: string) => void }) {
  const { data, erreur, chargement, charger } = useDonnees<Suivi>('/api/proprietaire/suivi');
  const loyers = data?.loyers || [];
  const dernier = loyers[loyers.length - 1];
  const total12 = loyers.reduce((s, m) => s + Number(m.encaisse || 0), 0);
  const retard = loyers.reduce((s, m) => s + Math.max(0, Number(m.du || 0) - Number(m.encaisse || 0)), 0);
  const max = Math.max(1, ...loyers.map((m) => Math.max(m.du || 0, m.encaisse || 0)));
  const impayes = lots.reduce((s, l) => s + Number(l.impaye || 0), 0);

  return (
    <Ecran onRefresh={charger} refreshing={chargement && !!data} basExtra={150}>
      <EnteteEspace titre="Mon patrimoine" sous={`${lots.length} lot${lots.length > 1 ? 's' : ''} confié${lots.length > 1 ? 's' : ''} à l’agence`} />
      {erreur ? <Message type="erreur" texte={erreur} action="Réessayer" onAction={charger} /> : null}
      {chargement && !data ? <Chargement /> : null}
      {data ? (
        <>
          <Text style={st.apSur}>Votre gestion</Text>
          <Text style={st.apTitre}>
            Tout est là, <Text style={{ color: C.brass, fontStyle: 'italic' }}>en un coup d’œil.</Text>
          </Text>
          {(() => {
            const enCours = (data.travaux || []).filter((t) => t.statut !== 'termine');
            const dernierDu = [...loyers].reverse().find((m) => m.du > 0);
            const blocs: { k: string; icone: keyof typeof Ionicons.glyphMap; sur: string; val: string; detail: string }[] = [
              {
                k: 'releve',
                icone: 'cash-outline',
                sur: 'Loyers',
                val: dernierDu ? eur(dernierDu.encaisse) : '—',
                detail: dernierDu ? (dernierDu.encaisse >= dernierDu.du ? `Encaissé — ${MOIS[Number(dernierDu.mois.slice(5, 7)) - 1]}` : `sur ${eur(dernierDu.du)} attendus`) : 'Aucun loyer sur la période',
              },
              { k: 'travaux', icone: 'construct-outline', sur: 'Travaux', val: enCours.length ? `${enCours.length} en cours` : 'Aucun', detail: enCours[0] ? `${enCours[0].titre} — étape ${enCours[0].etape}/${enCours[0].etapes}` : 'Aucune intervention en cours' },
              { k: 'documents', icone: 'folder-open-outline', sur: 'Documents', val: 'Mes documents', detail: 'Mandat, baux, relevés, factures' },
            ];
            return blocs.map((b, i) => (
              <Apparition key={b.k} delai={i * 120}>
                <Pressable onPress={() => aller(b.k)} style={({ pressed }) => [st.apBloc, pressed && { transform: [{ scale: 0.985 }] }]}>
                  <View style={st.apIcone}>
                    <Ionicons name={b.icone} size={24} color={C.brass} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.apBlocSur}>{b.sur}</Text>
                    <Text style={st.apBlocVal}>{b.val}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }} numberOfLines={1}>
                      {b.detail}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={C.brass} />
                </Pressable>
              </Apparition>
            ));
          })()}
          <View style={st.tuiles}>
            <View style={[st.tuile, { backgroundColor: C.navy }]}>
              <Text style={[st.tuileLib, { color: C.brassLight }]}>Encaissé ce mois-ci</Text>
              <Text style={[st.tuileVal, { color: '#fff' }]}>{eur(dernier?.encaisse)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>sur {eur(dernier?.du)} attendus</Text>
            </View>
            <View style={st.tuile}>
              <Text style={st.tuileLib}>Sur 12 mois</Text>
              <Text style={st.tuileVal}>{eur(total12)}</Text>
              <Text style={ui.petit}>
                {data.logementsLoues} lot{data.logementsLoues > 1 ? 's' : ''} loué{data.logementsLoues > 1 ? 's' : ''} sur {data.lots}
              </Text>
            </View>
          </View>
          <Carte>
            <Ligne libelle="En attente de reversement" valeur={eur2(data.reversement?.aRecevoir)} gras />
            <Ligne libelle="Loyers en retard" valeur={retard > 0 || impayes > 0 ? eur2(Math.max(retard, impayes)) : 'Aucun'} />
          </Carte>

          <Text style={ui.h2}>Loyers encaissés</Text>
          <Carte>
            <View style={st.graphe}>
              {loyers.map((m) => (
                <View key={m.mois} style={st.colonne}>
                  <View style={[st.barreDu, { height: `${(Number(m.du || 0) / max) * 100}%` }]}>
                    <View style={[st.barreEnc, { height: `${m.du ? Math.min(100, (Number(m.encaisse || 0) / Number(m.du)) * 100) : 0}%` }]} />
                  </View>
                  <Text style={st.colLib}>{MOIS[Number(m.mois.slice(5, 7)) - 1]?.slice(0, 1).toUpperCase()}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
              <Text style={ui.petit}>
                <Text style={{ color: C.brass }}>■</Text> encaissé
              </Text>
              <Text style={ui.petit}>
                <Text style={{ color: C.line }}>■</Text> attendu
              </Text>
            </View>
          </Carte>

          {data.travaux.length ? (
            <>
              <Text style={ui.h2}>Travaux en cours</Text>
              {data.travaux.slice(0, 3).map((t) => (
                <Carte key={t.reference} onPress={() => aller('travaux')}>
                  <Text style={{ fontWeight: '800', color: C.ink }}>{t.titre}</Text>
                  <Text style={ui.petit}>
                    {t.logement} · {t.libelle}
                  </Text>
                  <View style={st.progression}>
                    <View style={[st.progressionPlein, { width: `${t.etapes ? (t.etape / t.etapes) * 100 : 0}%` }]} />
                  </View>
                </Carte>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </Ecran>
  );
}

function Biens({ lots }: { lots: Lot[] }) {
  const [choisi, setChoisi] = useState<Lot | null>(null);
  const { data, chargement } = useDonnees<{ tenant: any; documents: any[] }>(choisi ? `/api/proprietaire/tenant?itemId=${encodeURIComponent(choisi.itemId)}` : null);

  if (choisi) {
    const t = data?.tenant;
    const qs = [...(t?.quittances || [])].sort((a: any, b: any) => (b.annee || 0) - (a.annee || 0) || (b.mois || 0) - (a.mois || 0)).slice(0, 12);
    return (
      <Ecran basExtra={150}>
        <Pressable onPress={() => setChoisi(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="chevron-back" size={22} color={C.navy} />
          <Text style={{ color: C.navy, fontWeight: '700' }}>Mes biens</Text>
        </Pressable>
        <Text style={ui.titre}>{choisi.adresse}</Text>
        <View style={[ui.trait, { marginBottom: 14 }]} />
        <Carte>
          <Ligne libelle="Statut" valeur={choisi.statut === 'loué' ? 'Loué' : 'Vacant'} />
          <Ligne libelle="Loyer hors charges" valeur={eur2(choisi.loyerHC)} />
          <Ligne libelle="Charges" valeur={eur2(choisi.charges)} />
          {choisi.honorairesPct != null ? <Ligne libelle="Honoraires de gestion" valeur={`${String(choisi.honorairesPct).replace('.', ',')} %`} /> : null}
          {choisi.lotCopro ? <Ligne libelle="Lot de copropriété" valeur={choisi.lotCopro} /> : null}
          {choisi.reference ? <Ligne libelle="Référence" valeur={choisi.reference} /> : null}
        </Carte>
        <Text style={ui.h2}>Locataire</Text>
        {chargement ? <Chargement /> : !t ? <Vide texte="Aucun locataire rattaché." /> : (
          <>
            <Carte>
              <Ligne libelle="Nom" valeur={t.name} />
              {t.bail?.dateEffet ? <Ligne libelle="Bail depuis le" valeur={dateFr(t.bail.dateEffet)} /> : null}
              {t.typeBail ? <Ligne libelle="Bail" valeur={t.typeBail} /> : null}
            </Carte>
            <Text style={ui.h2}>Quittances</Text>
            {qs.map((q: any) => {
              const due = !!q.statut && q.statut !== 'payée';
              return (
                <Carte
                  key={q.id || q.periode}
                  onPress={!due && q.id && !q.horsExtranet ? () => ouvrir(`/api/gestion/quittance-pdf?itemId=${encodeURIComponent(q.id)}&tenantAccountId=${encodeURIComponent(t.accountId)}`, q.nomFichier || `Quittance-${q.periode}.pdf`) : undefined}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 13, gap: 10 }}
                >
                  <Ionicons name={due ? 'alert-circle' : 'checkmark-circle'} size={24} color={due ? C.danger : C.ok} />
                  <Text style={{ flex: 1, fontWeight: '700', color: C.ink, textTransform: 'capitalize' }}>{q.periode}</Text>
                  <Text style={{ fontWeight: '800', color: due ? C.danger : C.navy }}>{eur2(q.montant)}</Text>
                </Carte>
              );
            })}
          </>
        )}
      </Ecran>
    );
  }

  return (
    <Ecran basExtra={150}>
      <EnteteEspace titre="Mes biens" />
      {!lots.length ? <Vide texte="Aucun bien enregistré." /> : null}
      {lots.map((l) => (
        <Carte key={l.itemId} onPress={() => setChoisi(l)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15.5 }}>{l.adresse}</Text>
              <Text style={ui.petit}>{l.statut === 'loué' ? `Loué · ${locs(l) || 'locataire'}` : 'Vacant'}</Text>
            </View>
            {Number(l.impaye) > 0 ? <Badge texte={`${eur(l.impaye)} dû`} couleur={C.danger} fond={C.dangerBg} /> : <Badge texte={l.statut === 'loué' ? 'À jour' : 'Vacant'} couleur={l.statut === 'loué' ? C.ok : C.inkSoft} fond={l.statut === 'loué' ? C.okBg : C.ground} />}
          </View>
          <Text style={{ marginTop: 8, fontWeight: '700', color: C.navy }}>
            {eur2(l.loyerHC)} + {eur2(l.charges)} de charges
          </Text>
        </Carte>
      ))}
    </Ecran>
  );
}

type Entree = { id: number; propertyItemId: string | null; date: string; libelle: string; categorie: string; credit: number; debit: number; documentId: number | null; documentName: string | null };
function Releves({ lots }: { lots: Lot[] }) {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const { data, erreur, chargement, charger } = useDonnees<{ entries: Entree[]; opening: number; years: number[] }>(`/api/gestion/releve?annee=${annee}`);
  const entrees = data?.entries || [];
  const credit = entrees.reduce((s, e) => s + Number(e.credit || 0), 0);
  const debit = entrees.reduce((s, e) => s + Number(e.debit || 0), 0);
  const ouverture = Number(data?.opening || 0);
  const annees = useMemo(() => [...new Set([new Date().getFullYear(), ...(data?.years || [])])].sort((a, b) => b - a), [data]);
  const adresse = (id: string | null) => lots.find((l) => l.itemId === id)?.adresse || '';
  const parMois = useMemo(() => {
    const g: Record<string, Entree[]> = {};
    [...entrees].reverse().forEach((e) => (g[e.date.slice(0, 7)] = [...(g[e.date.slice(0, 7)] || []), e]));
    return Object.entries(g);
  }, [entrees]);

  return (
    <Ecran onRefresh={charger} refreshing={chargement && !!data} basExtra={150}>
      <EnteteEspace titre="Loyers & relevés" sous="Tous les mouvements gérés pour votre compte" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {annees.map((a) => (
          <Pressable key={a} onPress={() => setAnnee(a)} style={[st.puce, a === annee && st.puceActive]}>
            <Text style={[{ fontWeight: '700', color: C.ink }, a === annee && { color: '#fff' }]}>{a}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {erreur ? <Message type="erreur" texte={erreur} /> : null}
      {chargement && !data ? <Chargement /> : null}
      {data ? (
        <Carte>
          {ouverture ? <Ligne libelle="Report au 1er janvier" valeur={eur2(ouverture)} /> : null}
          <Ligne libelle="Encaissé (crédit)" valeur={eur2(credit)} />
          <Ligne libelle="Déduit (débit)" valeur={eur2(debit)} />
          <Ligne libelle="Solde" valeur={eur2(ouverture + credit - debit)} gras />
          <Bouton titre={`Relevé ${annee} (PDF)`} variante="marine" onPress={() => ouvrir(`/api/gestion/releve-pdf?annee=${annee}`, `Releve-${annee}.pdf`)} style={{ marginTop: 12 }} />
        </Carte>
      ) : null}
      {data && !entrees.length ? <Vide texte="Aucun mouvement sur cette année." /> : null}
      {parMois.map(([mois, liste]) => (
        <View key={mois}>
          <Text style={st.mois}>
            {MOIS[Number(mois.slice(5, 7)) - 1]} {mois.slice(0, 4)}
          </Text>
          {liste.map((e) => (
            <Carte key={e.id} style={{ padding: 13 }} onPress={e.documentId ? () => ouvrir(`/api/documents/download?id=${e.documentId}`, e.documentName || 'justificatif.pdf') : undefined}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: C.ink }}>{e.libelle}</Text>
                  <Text style={ui.petit}>
                    {dateFr(e.date)}
                    {adresse(e.propertyItemId) ? ` · ${adresse(e.propertyItemId)}` : ''}
                    {e.documentId ? ' · 📎 justificatif' : ''}
                  </Text>
                </View>
                <Text style={{ fontWeight: '800', color: e.credit ? C.ok : C.danger }}>{e.credit ? `+ ${eur2(e.credit)}` : `− ${eur2(e.debit)}`}</Text>
              </View>
            </Carte>
          ))}
        </View>
      ))}
    </Ecran>
  );
}

function Travaux() {
  const { data, erreur, chargement, charger } = useDonnees<Suivi>('/api/proprietaire/suivi');
  const travaux = data?.travaux || [];
  return (
    <Ecran onRefresh={charger} refreshing={chargement && !!data} basExtra={150}>
      <EnteteEspace titre="Travaux" sous="Suivi étape par étape" />
      {erreur ? <Message type="erreur" texte={erreur} /> : null}
      {chargement && !data ? <Chargement /> : null}
      {data && !travaux.length ? <Vide texte="Aucun travaux en cours." /> : null}
      {travaux.map((t) => (
        <Carte key={t.reference}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>{t.titre}</Text>
            {t.montant ? <Text style={{ fontWeight: '800', color: C.navy }}>{eur2(t.montant)}</Text> : null}
          </View>
          <Text style={ui.petit}>
            {t.logement} · depuis le {dateFr(t.depuis)}
          </Text>
          <View style={st.progression}>
            <View style={[st.progressionPlein, { width: `${t.etapes ? (t.etape / t.etapes) * 100 : 0}%` }]} />
          </View>
          <Text style={[ui.petit, { marginTop: 6, fontWeight: '700', color: C.brass }]}>
            Étape {t.etape}/{t.etapes} · {t.libelle}
          </Text>
        </Carte>
      ))}
    </Ecran>
  );
}

export default function Proprietaire() {
  const { profile } = useAuth();
  const [onglet, setOnglet] = useState('tableau');
  const lots: Lot[] = profile?.properties || [];
  let ecran;
  if (onglet === 'biens') ecran = <Biens lots={lots} />;
  else if (onglet === 'releve') ecran = <Releves lots={lots} />;
  else if (onglet === 'documents') ecran = <Documents />;
  else if (onglet === 'travaux') ecran = <Travaux />;
  else if (onglet === 'paiement') ecran = <Paiement />;
  else if (onglet === 'infos') ecran = <MesInformations />;
  else if (onglet === 'syndic')
    ecran = (
      <Ecran basExtra={150}>
        <EnteteEspace titre="Syndic" sous="Copropriété de chacun de vos biens" />
        {lots.map((l) => (
          <CarteSyndic key={l.itemId} syndic={l.syndic} adresse={l.adresse} />
        ))}
      </Ecran>
    );
  else ecran = <Tableau lots={lots} aller={setOnglet} />;
  return (
    <View style={{ flex: 1 }}>
      {ecran}
      <BarreEspace onglets={ONGLETS} actif={onglet} onChoisir={setOnglet} menu={MENU} />
    </View>
  );
}

const st = StyleSheet.create({
  apSur: { fontSize: 11.5, fontWeight: '800', letterSpacing: 2.4, textTransform: 'uppercase', color: C.brass, marginTop: 4 },
  apTitre: { fontSize: 24, fontFamily: 'serif', fontWeight: '700', color: C.ink, marginTop: 4, marginBottom: 12 },
  apBloc: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.navy, borderRadius: 20, padding: 16, marginBottom: 10 },
  apIcone: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  apBlocSur: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', color: C.brassLight },
  apBlocVal: { fontSize: 21, fontWeight: '800', color: '#fff', marginTop: 2 },
  tuiles: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tuile: { flex: 1, backgroundColor: C.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.line },
  tuileLib: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  tuileVal: { fontSize: 22, fontWeight: '900', color: C.navy, marginVertical: 4, fontFamily: 'serif' },
  graphe: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 4 },
  colonne: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  barreDu: { width: '80%', backgroundColor: C.line, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden', minHeight: 2 },
  barreEnc: { width: '100%', backgroundColor: C.brass, borderRadius: 4 },
  colLib: { fontSize: 10, color: C.inkSoft, marginTop: 4 },
  progression: { height: 7, backgroundColor: C.line, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressionPlein: { height: '100%', backgroundColor: C.brass },
  puce: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  puceActive: { backgroundColor: C.navy, borderColor: C.navy },
  mois: { fontSize: 13, fontWeight: '800', color: C.brass, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 8 },
});
