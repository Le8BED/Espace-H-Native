import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { BarreRecherche, Champ, Choix, Feuille, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Ligne, Vide, s as ui } from '@/components/ui';
import { ouvrir, useDonnees } from '@/espace/commun';
import { extranetPost, extranetRequete } from '@/lib/api';
import { choisirDocument, prendrePhoto, type FichierJoint } from '@/lib/fichiers';
import { dateFr, eur, eur2 } from '@/lib/format';
import { C } from '@/lib/theme';
import { Onglets, Section, aujourdhui, confirmer, contient, useAction } from './outils';

// MAKOMSPACE, Domiciliation (demandes + dépôt du courrier scanné), VEFA.

// ---------------- MAKOMSPACE ----------------
type Booking = { id: number; durationType: string; purpose: string; startDate: string; endDate: string; startTime: string | null; endTime: string | null; contactName: string; contactFirstname: string; contactEmail: string; contactPhone: string; contactCompany: string; message: string; isAdminBlock: boolean; priceTtc: number; status: string; invoiceStatus: string | null; createdAt: string };
export function MakomAdmin() {
  const { data, erreur, chargement, charger } = useDonnees<{ bookings: Booking[] }>('/api/officeflex');
  const [filtre, setFiltre] = useState<'avenir' | 'en_attente' | 'tous'>('avenir');
  const [b, setB] = useState<Booking | null>(null);
  const [bloc, setBloc] = useState<{ date: string; startTime: string; endTime: string; reason: string } | null>(null);
  const { busy, lancer } = useAction();
  const auj = aujourdhui();
  const liste = (data?.bookings || []).filter((x) => (filtre === 'tous' ? true : filtre === 'en_attente' ? x.status === 'en_attente' : x.status !== 'annulee' && (x.endDate || x.startDate) >= auj)).sort((a, z) => a.startDate.localeCompare(z.startDate));
  return (
    <Section
      titre="MAKOMSPACE"
      sous="Réservations de la salle"
      chargement={chargement && !data}
      erreur={erreur}
      onRefresh={charger}
      action={<Bouton titre="Bloquer un créneau" variante="marine" onPress={() => setBloc({ date: auj, startTime: '09:00', endTime: '12:00', reason: '' })} style={{ marginBottom: 12 }} />}
    >
      <Onglets
        options={[
          ['avenir', 'À venir'],
          ['en_attente', 'En attente', (data?.bookings || []).filter((x) => x.status === 'en_attente').length],
          ['tous', 'Toutes'],
        ]}
        valeur={filtre}
        onChange={setFiltre}
      />
      {data && !liste.length ? <Vide texte="Aucune réservation." /> : null}
      {liste.map((x) => (
        <LigneAction
          key={x.id}
          icone={x.isAdminBlock ? 'lock-closed-outline' : 'calendar-outline'}
          titre={x.isAdminBlock ? `Bloqué · ${x.message || ''}` : `${x.contactFirstname} ${x.contactName}${x.contactCompany ? ` · ${x.contactCompany}` : ''}`}
          sous={`${dateFr(x.startDate)}${x.endDate && x.endDate !== x.startDate ? ` → ${dateFr(x.endDate)}` : ''}${x.startTime ? ` · ${x.startTime}-${x.endTime}` : ''} · ${x.durationType} · ${x.status}${x.priceTtc ? ` · ${eur(x.priceTtc)}` : ''}`}
          onPress={() => setB(x)}
        />
      ))}
      <Feuille visible={!!b} titre={b ? `Réservation n°${b.id}` : ''} onFermer={() => setB(null)}>
        {b ? (
          <>
            <Carte>
              <Ligne libelle="Client" valeur={`${b.contactFirstname} ${b.contactName}`} />
              {b.contactCompany ? <Ligne libelle="Société" valeur={b.contactCompany} /> : null}
              <Ligne libelle="Formule" valeur={b.durationType} />
              <Ligne libelle="Début" valeur={dateFr(b.startDate)} />
              {b.endDate ? <Ligne libelle="Fin" valeur={dateFr(b.endDate)} /> : null}
              {b.startTime ? <Ligne libelle="Horaire" valeur={`${b.startTime} – ${b.endTime}`} /> : null}
              <Ligne libelle="Montant" valeur={eur2(b.priceTtc)} gras />
              <Ligne libelle="Statut" valeur={b.status} />
              {b.message ? <Text style={[ui.petit, { marginTop: 6 }]}>{b.message}</Text> : null}
            </Carte>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {b.contactPhone ? <Bouton titre="Appeler" variante="contour" onPress={() => Linking.openURL(`tel:${b.contactPhone}`)} style={{ flex: 1 }} /> : null}
              {b.contactEmail ? <Bouton titre="Email" variante="contour" onPress={() => Linking.openURL(`mailto:${b.contactEmail}`)} style={{ flex: 1 }} /> : null}
            </View>
            {b.status === 'en_attente' ? <Bouton titre="Confirmer (paiement reçu)" onPress={() => lancer(() => extranetPost(`/api/officeflex/${b.id}`, { action: 'confirm' }).then(() => { setB(null); charger(); }), 'Réservation confirmée.')} desactive={busy} style={{ marginBottom: 8 }} /> : null}
            {b.status !== 'annulee' ? (
              <Bouton titre="Annuler la réservation" variante="danger" onPress={() => confirmer('Annuler', 'Le client sera prévenu par email (pas de remboursement automatique).', () => lancer(() => extranetRequete('DELETE', `/api/officeflex/${b.id}`).then(() => { setB(null); charger(); })), 'Annuler', true)} />
            ) : null}
          </>
        ) : null}
      </Feuille>
      <Feuille
        visible={!!bloc}
        titre="Bloquer un créneau"
        onFermer={() => setBloc(null)}
        pied={<Bouton titre={busy ? '…' : 'Bloquer'} desactive={busy} onPress={() => bloc && lancer(() => extranetPost('/api/officeflex/block', bloc).then(() => { setBloc(null); charger(); }), 'Créneau bloqué.')} style={{ flex: 1 }} />}
      >
        {bloc ? (
          <>
            <Champ label="Date (AAAA-MM-JJ)" valeur={bloc.date} onChange={(t) => setBloc({ ...bloc, date: t })} clavier="numbers-and-punctuation" />
            <Champ label="De (HH:MM)" valeur={bloc.startTime} onChange={(t) => setBloc({ ...bloc, startTime: t })} clavier="numbers-and-punctuation" />
            <Champ label="À (HH:MM)" valeur={bloc.endTime} onChange={(t) => setBloc({ ...bloc, endTime: t })} clavier="numbers-and-punctuation" />
            <Champ label="Motif" valeur={bloc.reason} onChange={(t) => setBloc({ ...bloc, reason: t })} />
          </>
        ) : null}
      </Feuille>
    </Section>
  );
}

// ---------------- DOMICILIATION ----------------
type Lead = { id: number; companyName: string; legalForm: string; siret: string; managerName: string; managerFirstname: string; email: string; phone: string; startDate: string; signatureDate: string; signatureTime: string; status: string; createdAt: string };
type Courrier = { id: number; client: string; accountId: string; dateReception: string; expediteur: string; objet: string; recommande: boolean; luLe: string | null; retireLe: string | null; notifieLe: string | null };
export function DomiciliationAdmin() {
  const [vue, setVue] = useState<'courrier' | 'demandes'>('courrier');
  const courriers = useDonnees<{ courriers: Courrier[]; clients: { id: string; name: string }[] }>('/api/domiciliation/courrier');
  const leads = useDonnees<{ leads: Lead[] }>(vue === 'demandes' ? '/api/domiciliation' : null);
  const [depot, setDepot] = useState<{ accountId: string; expediteur: string; objet: string; recommande: boolean; date: string; fichier: FichierJoint | null } | null>(null);
  const [q, setQ] = useState('');
  const { busy, lancer } = useAction();
  const clients = courriers.data?.clients || [];
  const scanner = async (photo: boolean) => {
    try {
      const f = photo ? await prendrePhoto() : await choisirDocument();
      if (f && depot) setDepot({ ...depot, fichier: f });
    } catch (e) {
      Alert.alert('Fichier', (e as Error).message);
    }
  };
  return (
    <Section
      titre="Domiciliation"
      chargement={courriers.chargement && !courriers.data}
      erreur={courriers.erreur || leads.erreur}
      onRefresh={() => {
        courriers.charger();
        leads.charger();
      }}
      action={vue === 'courrier' ? <Bouton titre="Déposer un courrier (scan)" variante="marine" onPress={() => setDepot({ accountId: '', expediteur: '', objet: '', recommande: false, date: aujourdhui(), fichier: null })} style={{ marginBottom: 12 }} /> : undefined}
    >
      <Onglets
        options={[
          ['courrier', 'Courrier'],
          ['demandes', 'Demandes de souscription'],
        ]}
        valeur={vue}
        onChange={setVue}
      />
      {vue === 'courrier' ? (
        <>
          <BarreRecherche valeur={q} onChange={setQ} placeholder="Client, expéditeur…" />
          {(courriers.data?.courriers || [])
            .filter((c) => contient(q, c.client, c.expediteur, c.objet))
            .slice(0, 100)
            .map((c) => (
              <LigneAction
                key={c.id}
                icone={c.recommande ? 'ribbon-outline' : 'mail-outline'}
                titre={`${c.client} · ${c.expediteur}`}
                sous={`${c.objet || 'Courrier'} · ${dateFr(c.dateReception)} · ${c.luLe ? 'lu' : 'non lu'}${c.retireLe ? ' · retiré' : ''}${c.notifieLe ? '' : ' · pas encore notifié'}`}
                onPress={() => ouvrir(`/api/domiciliation/courrier?fichier=${c.id}&telecharger=1`, `courrier-${c.id}.pdf`)}
                droite={
                  !c.retireLe ? (
                    <Bouton titre="Retiré" variante="contour" onPress={() => lancer(() => extranetPost('/api/domiciliation/courrier', { action: 'retrait', id: c.id, retire: true }).then(courriers.charger))} />
                  ) : undefined
                }
              />
            ))}
          {courriers.data && !courriers.data.courriers.length ? <Vide texte="Aucun courrier." /> : null}
        </>
      ) : (
        <>
          {(leads.data?.leads || []).map((l) => (
            <Carte key={l.id}>
              <Text style={{ fontWeight: '800', color: C.ink }}>
                {l.companyName} <Text style={ui.petit}>({l.legalForm})</Text>
              </Text>
              <Text style={ui.petit}>
                {l.managerFirstname} {l.managerName} · SIRET {l.siret}
              </Text>
              <Text style={ui.petit}>
                Signature : {dateFr(l.signatureDate)} à {l.signatureTime} · {l.status}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <Bouton titre="Appeler" variante="contour" onPress={() => Linking.openURL(`tel:${l.phone}`)} />
                <Bouton titre="Contrat" variante="contour" onPress={() => ouvrir(`/api/domiciliation/${l.id}/document?type=contrat`, `contrat-domiciliation-${l.id}.pdf`)} />
                <Bouton titre="Attestation" variante="contour" onPress={() => ouvrir(`/api/domiciliation/${l.id}/document?type=attestation`, `attestation-domiciliation-${l.id}.pdf`)} />
                {l.status !== 'annule' && l.status !== 'annulee' ? <Bouton titre="Annuler" variante="danger" onPress={() => confirmer('Annuler', `Annuler la demande de ${l.companyName} ?`, () => lancer(() => extranetRequete('DELETE', `/api/domiciliation/${l.id}`).then(leads.charger)), 'Annuler', true)} /> : null}
              </View>
            </Carte>
          ))}
          {leads.data && !leads.data.leads.length ? <Vide texte="Aucune demande." /> : null}
        </>
      )}
      <Feuille
        visible={!!depot}
        titre="Déposer un courrier"
        onFermer={() => setDepot(null)}
        pied={
          <Bouton
            titre={busy ? 'Envoi…' : 'Déposer dans l’espace du client'}
            desactive={busy || !depot?.accountId || !depot?.expediteur || !depot?.fichier}
            onPress={() =>
              depot?.fichier &&
              lancer(async () => {
                const fic = depot.fichier!;
                await extranetPost('/api/domiciliation/courrier', {
                  action: 'deposer',
                  accountId: depot.accountId,
                  dateReception: depot.date,
                  expediteur: depot.expediteur,
                  objet: depot.objet,
                  recommande: depot.recommande,
                  fichier: { filename: fic.filename, contentType: fic.contentType, data: fic.data },
                });
                setDepot(null);
                courriers.charger();
              }, 'Courrier déposé. Pensez à notifier le client depuis l’ordinateur si besoin.')
            }
            style={{ flex: 1 }}
          />
        }
      >
        {depot ? (
          <>
            <Choix label="Client" options={clients.map((c) => [String(c.id), c.name] as [string, string])} valeur={depot.accountId} onChange={(v) => setDepot({ ...depot, accountId: v })} />
            <Champ label="Expéditeur" valeur={depot.expediteur} onChange={(t) => setDepot({ ...depot, expediteur: t })} />
            <Champ label="Objet (facultatif)" valeur={depot.objet} onChange={(t) => setDepot({ ...depot, objet: t })} />
            <Champ label="Reçu le (AAAA-MM-JJ)" valeur={depot.date} onChange={(t) => setDepot({ ...depot, date: t })} clavier="numbers-and-punctuation" />
            <Choix label="Recommandé ?" options={[['non', 'Non'], ['oui', 'Oui']]} valeur={depot.recommande ? 'oui' : 'non'} onChange={(v) => setDepot({ ...depot, recommande: v === 'oui' })} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Bouton titre="Scanner (photo)" variante="marine" onPress={() => scanner(true)} style={{ flex: 1 }} />
              <Bouton titre="Fichier PDF" variante="contour" onPress={() => scanner(false)} style={{ flex: 1 }} />
            </View>
            {depot.fichier ? <Badge texte={`📎 ${depot.fichier.filename}`} couleur={C.ok} fond={C.okBg} /> : null}
          </>
        ) : null}
      </Feuille>
    </Section>
  );
}

// ---------------- VEFA ----------------
type Resa = { id: number; lot: string; price: number; surface: number; civilite: string; nom: string; prenom: string; contactPhone: string; contactEmail: string; modeFinancement: string; montantEmprunte: number | null; signatureDate: string | null; signatureTime: string | null; status: string; createdAt: string; ville: string };
export function VefaAdmin() {
  const { data, erreur, chargement, charger } = useDonnees<{ reservations: Resa[] }>('/api/vefa');
  const { lancer } = useAction();
  return (
    <Section titre="VEFA" sous="Réservations — Les Jardins de la Sauer" chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      {data && !data.reservations.length ? <Vide texte="Aucune réservation." /> : null}
      {(data?.reservations || []).map((r) => (
        <Carte key={r.id}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>
              Lot {r.lot} · {r.civilite} {r.prenom} {r.nom}
            </Text>
            <Text style={{ fontWeight: '800', color: C.navy }}>{eur(r.price)}</Text>
          </View>
          <Text style={ui.petit}>
            {r.modeFinancement === 'pret' ? `Prêt${r.montantEmprunte ? ` de ${eur(r.montantEmprunte)}` : ''}` : 'Comptant'} · {r.ville} · demandé le {dateFr(r.createdAt)}
          </Text>
          <Text style={ui.petit}>{r.signatureDate ? `Signature le ${dateFr(r.signatureDate)} à ${r.signatureTime}` : 'Rendez-vous de signature pas encore choisi'} · {r.status}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <Bouton titre="Appeler" variante="contour" onPress={() => Linking.openURL(`tel:${r.contactPhone}`)} />
            <Bouton titre="Email" variante="contour" onPress={() => Linking.openURL(`mailto:${r.contactEmail}`)} />
            <Bouton titre="Document" variante="contour" onPress={() => ouvrir(`/api/vefa/${r.id}/document`, `reservation-${r.lot}.pdf`)} />
            {!/annul/.test(r.status) ? <Bouton titre="Annuler" variante="danger" onPress={() => confirmer('Annuler', `Annuler la réservation du lot ${r.lot} ?`, () => lancer(() => extranetRequete('DELETE', `/api/vefa/${r.id}`).then(charger)), 'Annuler', true)} /> : null}
          </View>
        </Carte>
      ))}
    </Section>
  );
}
