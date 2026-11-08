import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { BarreRecherche, Champ, Choix, Feuille } from '@/components/form';
import { Badge, Bouton, Carte, Ligne, Vide, s as ui } from '@/components/ui';
import { ouvrir, useDonnees } from '@/espace/commun';
import { extranetPost } from '@/lib/api';
import { choisirDocument, prendrePhoto } from '@/lib/fichiers';
import { dateFr, eur2 } from '@/lib/format';
import { C } from '@/lib/theme';
import { Onglets, Section, aujourdhui, confirmer, contient, useAction } from './outils';

// Travaux : appels d'offres et tickets, devis des artisans, avancement par
// étape (devis → accepté → en cours → terminé → réglé), facture.

type Ligne = { ligneId: string; nom: string; entreprise: string; email: string; telephone: string; statut: string; montant: number | null; delai: string; commentaire: string; devis: { nom: string } | null };
type Appel = {
  id: string;
  reference: string;
  logementLabel: string;
  adresse: string;
  titre: string;
  metier: string;
  description: string;
  statut: string;
  etape: string;
  montantFinal: number | null;
  createdAt: string;
  proprietaireNom: string;
  devisDocumentId: number | null;
  factureDocumentId: number | null;
  factureNumero: string | null;
  prestataires: Ligne[];
};
type Donnees = { appels: Appel[]; etapes: [string, string][]; logements: { key: string; label: string }[]; prestataires: { id: string; nom: string; entreprise: string; metier: string }[] };

const LIGNE_STATUT: Record<string, [string, string, string]> = {
  envoye: ['Demandé', C.inkSoft, C.ground],
  relance: ['Relancé', C.warn, C.warnBg],
  devis_recu: ['Devis reçu', C.navy2, '#e3edf8'],
  retenu: ['Retenu', C.ok, C.okBg],
  non_retenu: ['Non retenu', C.inkSoft, C.ground],
  decline: ['Décliné', C.danger, C.dangerBg],
};

export default function Travaux() {
  const { data, erreur, chargement, charger } = useDonnees<Donnees>('/api/travaux');
  const [etape, setEtape] = useState('actifs');
  const [q, setQ] = useState('');
  const [a, setA] = useState<Appel | null>(null);
  const [montant, setMontant] = useState('');
  const [nouveau, setNouveau] = useState<{ logementKey: string; titre: string; prestataireId: string; montant: string; description: string } | null>(null);
  const { busy, lancer } = useAction();
  const etapes = data?.etapes || [];
  const libEtape = (k: string) => etapes.find(([e]) => e === k)?.[1] || k;
  const liste = (data?.appels || []).filter((x) => x.statut !== 'annule' || etape === 'tous').filter((x) => (etape === 'actifs' ? x.etape !== 'regle' : etape === 'tous' ? true : x.etape === etape) && contient(q, x.titre, x.adresse, x.reference, x.logementLabel));

  const action = async (corps: Record<string, unknown>, ok?: string) => {
    const r = await lancer(() => extranetPost('/api/travaux', corps), ok);
    if (r) {
      await charger();
      setA(null);
    }
  };
  const joindre = async (docType: 'devis' | 'facture', photo: boolean) => {
    if (!a) return;
    try {
      const f = photo ? await prendrePhoto() : await choisirDocument();
      if (!f) return;
      await action({ action: 'joindre', id: a.id, docType, fichier: { filename: f.filename, contentType: f.contentType, data: f.data }, montant: montant ? Number(montant.replace(',', '.')) : undefined, date: aujourdhui() }, 'Document joint.');
    } catch (e) {
      Alert.alert('Fichier', (e as Error).message);
    }
  };

  return (
    <Section
      titre="Travaux"
      chargement={chargement && !data}
      erreur={erreur}
      onRefresh={charger}
      action={<Bouton titre="Travaux directs (sans appel d’offres)" variante="marine" onPress={() => setNouveau({ logementKey: '', titre: '', prestataireId: '', montant: '', description: '' })} style={{ marginBottom: 12 }} />}
    >
      <Onglets options={[['actifs', 'En cours'], ...etapes, ['tous', 'Tous']] as [string, string][]} valeur={etape} onChange={setEtape} />
      <BarreRecherche valeur={q} onChange={setQ} placeholder="Titre, adresse, référence…" />
      {data && !liste.length ? <Vide texte="Aucun travaux." /> : null}
      {liste.map((x) => (
        <Carte
          key={x.id}
          onPress={() => {
            setA(x);
            setMontant(x.montantFinal ? String(x.montantFinal).replace('.', ',') : '');
          }}
          style={{ padding: 14 }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>{x.titre}</Text>
            {x.montantFinal ? <Text style={{ fontWeight: '800', color: C.navy }}>{eur2(x.montantFinal)}</Text> : null}
          </View>
          <Text style={ui.petit}>
            {x.reference} · {x.logementLabel || x.adresse}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Badge texte={libEtape(x.etape)} />
            {x.statut === 'annule' ? <Badge texte="Annulé" couleur={C.danger} fond={C.dangerBg} /> : null}
            {x.prestataires.filter((p) => p.statut === 'devis_recu').length ? <Badge texte={`${x.prestataires.filter((p) => p.statut === 'devis_recu').length} devis reçu(s)`} couleur={C.navy2} fond="#e3edf8" /> : null}
          </View>
        </Carte>
      ))}

      <Feuille visible={!!a} titre={a?.titre || ''} onFermer={() => setA(null)}>
        {a ? (
          <>
            <Carte>
              <Ligne libelle="Référence" valeur={a.reference} />
              <Ligne libelle="Logement" valeur={a.logementLabel || a.adresse} />
              {a.proprietaireNom ? <Ligne libelle="Propriétaire" valeur={a.proprietaireNom} /> : null}
              {a.metier ? <Ligne libelle="Métier" valeur={a.metier} /> : null}
              <Ligne libelle="Créé le" valeur={dateFr(a.createdAt)} />
              <Ligne libelle="Étape" valeur={libEtape(a.etape)} gras />
            </Carte>
            {a.description ? <Text style={[ui.texte, { marginBottom: 10 }]}>{a.description}</Text> : null}
            <Text style={ui.lib}>Faire avancer</Text>
            <Champ label="Montant final (€, facultatif)" valeur={montant} onChange={setMontant} clavier="decimal-pad" />
            <Choix
              options={etapes}
              valeur={a.etape}
              onChange={(v) => action({ action: 'etape', id: a.id, etape: v, montant: montant ? Number(montant.replace(',', '.')) : undefined }, `Étape : ${libEtape(v)}.`)}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {a.devisDocumentId ? <Bouton titre="Voir le devis" variante="contour" onPress={() => ouvrir(`/api/documents/download?id=${a.devisDocumentId}`, `devis-${a.reference}.pdf`)} style={{ flex: 1 }} /> : null}
              {a.factureDocumentId ? <Bouton titre="Voir la facture" variante="contour" onPress={() => ouvrir(`/api/documents/download?id=${a.factureDocumentId}`, `facture-${a.reference}.pdf`)} style={{ flex: 1 }} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Bouton titre="Joindre devis" variante="contour" onPress={() => joindre('devis', false)} style={{ flex: 1 }} />
              <Bouton titre="Joindre facture" variante="contour" onPress={() => joindre('facture', false)} style={{ flex: 1 }} />
            </View>
            <Bouton titre="Photographier la facture" variante="contour" onPress={() => joindre('facture', true)} />
            {a.prestataires.length ? <Text style={ui.h2}>Artisans consultés</Text> : null}
            {a.prestataires.map((p) => {
              const [lib, coul, fond] = LIGNE_STATUT[p.statut] || [p.statut, C.inkSoft, C.ground];
              return (
                <Carte key={p.ligneId} style={{ padding: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>{p.entreprise || p.nom}</Text>
                    <Badge texte={lib} couleur={coul} fond={fond} />
                  </View>
                  {p.montant ? <Text style={ui.petit}>Devis : {eur2(p.montant)}{p.delai ? ` · délai ${p.delai}` : ''}</Text> : null}
                  {p.commentaire ? <Text style={ui.petit}>{p.commentaire}</Text> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {p.telephone ? <Bouton titre="Appeler" variante="contour" onPress={() => Linking.openURL(`tel:${p.telephone.replace(/\s/g, '')}`)} /> : null}
                    {p.devis ? <Bouton titre="Devis" variante="contour" onPress={() => ouvrir(`/api/travaux?devis=${p.ligneId}`, p.devis!.nom || 'devis.pdf')} /> : null}
                    {['envoye', 'relance'].includes(p.statut) ? <Bouton titre="Relancer" variante="contour" onPress={() => action({ action: 'relancer', ligneId: p.ligneId }, 'Relance envoyée.')} /> : null}
                    {p.statut === 'devis_recu' ? (
                      <Bouton titre="Retenir" variante="marine" onPress={() => confirmer('Retenir ce devis', `${p.entreprise || p.nom} sera prévenu, les autres aussi.`, () => action({ action: 'retenir', ligneId: p.ligneId, prevenirRetenu: true, prevenirAutres: true }, 'Devis retenu.'))} />
                    ) : null}
                  </View>
                </Carte>
              );
            })}
            {a.statut !== 'annule' ? (
              <Bouton titre="Annuler ces travaux" variante="danger" onPress={() => confirmer('Annuler', 'Annuler ces travaux ?', () => action({ action: 'statut', id: a.id, statut: 'annule' }), 'Annuler les travaux', true)} style={{ marginTop: 12 }} />
            ) : null}
          </>
        ) : null}
      </Feuille>

      <Feuille
        visible={!!nouveau}
        titre="Travaux directs"
        onFermer={() => setNouveau(null)}
        pied={
          <Bouton
            titre={busy ? 'Enregistrement…' : 'Créer'}
            desactive={busy || !nouveau?.logementKey || !nouveau?.titre || !nouveau?.prestataireId}
            onPress={() =>
              nouveau &&
              lancer(async () => {
                await extranetPost('/api/travaux', { action: 'direct', logementKey: nouveau.logementKey, titre: nouveau.titre, prestataireId: nouveau.prestataireId, montant: nouveau.montant ? Number(nouveau.montant.replace(',', '.')) : undefined, description: nouveau.description });
                setNouveau(null);
                charger();
              }, 'Travaux créés.')
            }
            style={{ flex: 1 }}
          />
        }
      >
        {nouveau ? (
          <>
            <Choix label="Logement" options={(data?.logements || []).map((l) => [l.key, l.label] as [string, string])} valeur={nouveau.logementKey} onChange={(v) => setNouveau({ ...nouveau, logementKey: v })} />
            <Champ label="Titre" valeur={nouveau.titre} onChange={(t) => setNouveau({ ...nouveau, titre: t })} />
            <Choix label="Artisan" options={(data?.prestataires || []).map((p) => [p.id, p.entreprise || p.nom] as [string, string])} valeur={nouveau.prestataireId} onChange={(v) => setNouveau({ ...nouveau, prestataireId: v })} />
            <Champ label="Montant (€)" valeur={nouveau.montant} onChange={(t) => setNouveau({ ...nouveau, montant: t })} clavier="decimal-pad" />
            <Champ label="Description" valeur={nouveau.description} onChange={(t) => setNouveau({ ...nouveau, description: t })} multiligne />
          </>
        ) : null}
      </Feuille>
      {data?.prestataires?.length ? <Text style={[ui.petit, { marginTop: 8 }]}>{data.prestataires.length} artisans enregistrés.</Text> : null}
    </Section>
  );
}
