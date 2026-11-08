import { useState } from 'react';
import { Text, View } from 'react-native';
import { Champ, Feuille, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Chargement, Ligne, Vide, s as ui } from '@/components/ui';
import { useDonnees } from '@/espace/commun';
import { extranetPost } from '@/lib/api';
import { dateFr, eur2 } from '@/lib/format';
import { C } from '@/lib/theme';
import { Section, aujourdhui, confirmer, useAction } from './outils';

// Reversements aux propriétaires : montant à reverser, détail, travaux à
// déduire, enregistrement du virement.

type Ligne = { ownerAccountId: string; nom: string; aReverser: number; report: number; directs: number; avance: { montant: number; mois: string[] }; dernierReversement: { date: string; montant: number } | null; iban: boolean; travaux: number };
type Detail = {
  nom: string;
  beneficiaire: { titulaire: string; iban: string; bic: string } | null;
  aReverser: number;
  avance: { montant: number; mois: string[] } | null;
  versements: { auProprietaire: number; honorairesDepuisGestion: number; reportProchain: number; travaux: number };
  detail: { lignes: { categorie: string; libelle: string; montant: number }[] };
  travauxARegler: { appelId: string; reference: string; titre: string; montant: number; prestataire: string }[];
  dernierReversement: { date: string; montant: number } | null;
};

function Proprietaire({ id, retour }: { id: string; retour: () => void }) {
  const { data, chargement, charger } = useDonnees<Detail>(`/api/gestion/reversement?ownerAccountId=${encodeURIComponent(id)}`);
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(aujourdhui());
  const [ouvert, setOuvert] = useState(false);
  const { busy, lancer } = useAction();
  if (chargement && !data) return <Chargement />;
  if (!data) return null;
  return (
    <View>
      <Bouton titre="‹ Tous les propriétaires" variante="contour" onPress={retour} style={{ alignSelf: 'flex-start', marginBottom: 12 }} />
      <Text style={ui.titre}>{data.nom}</Text>
      <Carte style={{ marginTop: 12 }}>
        <Ligne libelle="À reverser" valeur={eur2(data.versements?.auProprietaire ?? data.aReverser)} gras />
        {data.versements?.honorairesDepuisGestion ? <Ligne libelle="Honoraires retenus" valeur={eur2(data.versements.honorairesDepuisGestion)} /> : null}
        {data.versements?.travaux ? <Ligne libelle="Travaux déduits" valeur={eur2(data.versements.travaux)} /> : null}
        {data.versements?.reportProchain ? <Ligne libelle="Reporté au prochain" valeur={eur2(data.versements.reportProchain)} /> : null}
        {data.avance?.montant ? <Ligne libelle="Loyers payés d’avance (mis de côté)" valeur={eur2(data.avance.montant)} /> : null}
        {data.dernierReversement ? <Ligne libelle="Dernier reversement" valeur={`${eur2(data.dernierReversement.montant)} le ${dateFr(data.dernierReversement.date)}`} /> : null}
      </Carte>
      {data.beneficiaire?.iban ? (
        <Carte>
          <Ligne libelle="Titulaire" valeur={data.beneficiaire.titulaire} />
          <Ligne libelle="IBAN" valeur={data.beneficiaire.iban.replace(/(.{4})/g, '$1 ').trim()} />
          {data.beneficiaire.bic ? <Ligne libelle="BIC" valeur={data.beneficiaire.bic} /> : null}
        </Carte>
      ) : (
        <Badge texte="IBAN du propriétaire manquant" couleur={C.danger} fond={C.dangerBg} />
      )}
      {data.detail?.lignes?.length ? <Text style={ui.h2}>Détail</Text> : null}
      {data.detail?.lignes?.map((l, i) => (
        <Ligne key={i} libelle={l.libelle} valeur={eur2(l.montant)} />
      ))}
      {data.travauxARegler?.length ? <Text style={ui.h2}>Travaux à régler</Text> : null}
      {data.travauxARegler?.map((t) => (
        <Carte key={t.appelId} style={{ padding: 12 }}>
          <Text style={{ fontWeight: '800', color: C.ink }}>{t.titre}</Text>
          <Text style={ui.petit}>
            {t.reference} · {t.prestataire} · {eur2(t.montant)}
          </Text>
          <Bouton titre="Marquer réglé" variante="contour" onPress={() => confirmer('Travaux réglés', `${t.titre} : ${eur2(t.montant)}`, () => lancer(() => extranetPost('/api/gestion/reversement', { action: 'regler', ownerAccountId: id, appelId: t.appelId }).then(charger)))} style={{ marginTop: 8 }} />
        </Carte>
      ))}
      <Bouton
        titre="Enregistrer un reversement"
        onPress={() => {
          setMontant(String(data.versements?.auProprietaire ?? data.aReverser ?? '').replace('.', ','));
          setOuvert(true);
        }}
        style={{ marginTop: 14 }}
      />
      <Feuille
        visible={ouvert}
        titre="Reversement"
        onFermer={() => setOuvert(false)}
        pied={
          <Bouton
            titre={busy ? '…' : 'Enregistrer'}
            desactive={busy}
            onPress={() =>
              lancer(async () => {
                await extranetPost('/api/gestion/reversement', { action: 'reversement', ownerAccountId: id, montant: Number(montant.replace(',', '.')), date });
                setOuvert(false);
                charger();
              }, 'Reversement enregistré sur le relevé du propriétaire.')
            }
            style={{ flex: 1 }}
          />
        }
      >
        <Champ label="Montant viré (€)" valeur={montant} onChange={setMontant} clavier="decimal-pad" />
        <Champ label="Date du virement (AAAA-MM-JJ)" valeur={date} onChange={setDate} clavier="numbers-and-punctuation" />
        <Text style={ui.petit}>Le virement se fait depuis votre banque ; ici, il est seulement enregistré sur le relevé du propriétaire.</Text>
      </Feuille>
    </View>
  );
}

export default function Reversements() {
  const { data, erreur, chargement, charger } = useDonnees<{ liste: Ligne[] }>('/api/gestion/reversement?tous=1');
  const [id, setId] = useState<string | null>(null);
  if (id)
    return (
      <Section titre="Reversement" onRefresh={charger}>
        <Proprietaire
          id={id}
          retour={() => {
            setId(null);
            charger();
          }}
        />
      </Section>
    );
  const liste = [...(data?.liste || [])].sort((a, b) => b.aReverser - a.aReverser);
  return (
    <Section titre="Reversements" sous="À reverser aux propriétaires" chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      {data ? (
        <Carte>
          <Ligne libelle="Total à reverser" valeur={eur2(liste.reduce((s, l) => s + Math.max(0, l.aReverser), 0))} gras />
        </Carte>
      ) : null}
      {data && !liste.length ? <Vide texte="Aucun propriétaire." /> : null}
      {liste.map((l) => (
        <LigneAction
          key={l.ownerAccountId}
          icone={l.iban ? 'cash-outline' : 'alert-circle-outline'}
          titre={l.nom}
          sous={`${eur2(l.aReverser)} à reverser${l.travaux ? ` · ${l.travaux} travaux` : ''}${l.dernierReversement ? ` · dernier le ${dateFr(l.dernierReversement.date)}` : ''}${!l.iban ? ' · IBAN manquant' : ''}`}
          onPress={() => setId(l.ownerAccountId)}
        />
      ))}
    </Section>
  );
}
