import { useState } from 'react';
import { Text, View } from 'react-native';
import { Champ, Feuille, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Ligne, s as ui } from '@/components/ui';
import { useDonnees } from '@/espace/commun';
import { extranetPost } from '@/lib/api';
import { dateFr, eur, eur2 } from '@/lib/format';
import { C } from '@/lib/theme';
import { Section, Stat, plus, useAction } from './outils';

// Accueil de l'administration : encaissements du mois et alertes (impayés,
// assurances, révisions IRL, travaux signalés, anciens locataires).

type Base = { tenantAccountId: string; name: string; email: string | null; adresse: string; ownerName: string | null };
type Impaye = Base & { montantDu: number; periodes: { periode: string; montant: number; statut: string }[]; niveauRelance: number; derniereRelanceDate: string | null; etape: string; garantieActivee: any };
type Assurance = Base & { key: string; situation: 'manquante' | 'expiree' | 'bientot'; echeance: string | null; relanceConseillee: boolean; ack: any };
type Irl = Base & { key: string; dateRevision: string; enRetard: boolean; loyerHC: number; proposition: { trimestre: string; nouveau: { label: string; valeur: number }; ancien: { label: string; valeur: number }; nouveauLoyer: number } | null; dpeBloque: boolean; ack: any };
type Travail = Base & { titre: string; description: string; urgent: boolean; statut: string; joursOuvert: number; travauxLies?: { reference: string; etapeLabel: string } };
type Alertes = {
  counts: Record<string, number>;
  emails: { a_valider: number; non_identifie: number; a_repondre: number; perso?: number } | null;
  impayes: Impaye[];
  assurances: Assurance[];
  irl: Irl[];
  travaux: Travail[];
  anciens: { accountId: string; name: string; dateSortie: string; du: number; restitutionStatut: string; retard: string | null }[];
};
type Resume = { label: string; attendus: number; regles: number; partiels: number; impayes: number; montantAttendu: number; montantRecu: number; aEnvoyer: number };

const ETAPE: Record<string, [string, string, string]> = {
  commandement: ['Commandement à faire', C.danger, C.dangerBg],
  relance1: ['Relancé', C.warn, C.warnBg],
  retard: ['En retard', C.warn, C.warnBg],
  attente: ['En attente', C.inkSoft, C.ground],
};

export default function Accueil({ aller }: { aller: (k: string) => void }) {
  const a = useDonnees<Alertes>('/api/gestion/alertes');
  const r = useDonnees<Resume>('/api/gestion/encaissements?resume=1');
  const [relance, setRelance] = useState<Impaye | null>(null);
  const [mail, setMail] = useState<{ t: Base; key?: string; sujet: string; texte: string } | null>(null);
  const { busy, lancer } = useAction();
  const d = a.data;
  const recharger = () => {
    a.charger();
    r.charger();
  };

  return (
    <Section titre="Tableau de bord" chargement={(a.chargement || r.chargement) && !d} erreur={a.erreur} onRefresh={recharger}>
      {r.data ? (
        <Carte onPress={() => aller('loyers')}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: C.ink, textTransform: 'capitalize' }}>Encaissements de {r.data.label}</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: C.navy, fontFamily: 'serif', marginTop: 4 }}>
            {r.data.regles} / {r.data.attendus}
          </Text>
          <Text style={ui.petit}>
            loyers réglés · {eur(r.data.montantRecu)} reçus sur {eur(r.data.montantAttendu)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {r.data.partiels ? <Badge texte={plus(r.data.partiels, 'paiement partiel', 'paiements partiels')} couleur={C.warn} fond={C.warnBg} /> : null}
            {r.data.impayes ? <Badge texte={plus(r.data.impayes, 'impayé')} couleur={C.danger} fond={C.dangerBg} /> : null}
            {r.data.aEnvoyer ? <Badge texte={plus(r.data.aEnvoyer, 'quittance à envoyer', 'quittances à envoyer')} /> : null}
          </View>
        </Carte>
      ) : null}

      {d ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <Stat valeur={d.counts.impayes || 0} libelle={`Impayés · ${eur(d.counts.impayesTotal || 0)}`} couleur={C.danger} />
            <Stat valeur={d.counts.travaux || 0} libelle="Travaux signalés" couleur={C.warn} onPress={() => aller('travaux')} />
            <Stat valeur={d.counts.assurances || 0} libelle="Assurances" couleur={C.navy2} />
            <Stat valeur={d.counts.irl || 0} libelle="Révisions IRL" couleur={C.brass} />
            {d.emails ? <Stat valeur={d.emails.a_valider + d.emails.non_identifie + (d.emails.a_repondre || 0)} libelle="Emails à traiter" couleur="#5b6b82" onPress={() => aller('emails')} /> : null}
            <Stat valeur={d.counts.anciens || 0} libelle="Anciens locataires" couleur={C.inkSoft} />
          </View>

          {d.impayes.length ? <Text style={ui.h2}>Loyers impayés</Text> : null}
          {d.impayes.map((i) => {
            const [lib, coul, fond] = ETAPE[i.etape] || ETAPE.attente;
            return (
              <Carte key={i.tenantAccountId}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>{i.name}</Text>
                  <Text style={{ fontWeight: '900', color: C.danger }}>{eur2(i.montantDu)}</Text>
                </View>
                <Text style={ui.petit}>
                  {i.adresse}
                  {i.ownerName ? ` · Prop. ${i.ownerName}` : ''}
                </Text>
                <Text style={[ui.petit, { marginTop: 4 }]}>{i.periodes.map((p) => p.periode).join(', ')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Badge texte={lib} couleur={coul} fond={fond} />
                  {i.derniereRelanceDate ? <Text style={ui.petit}>relance n°{i.niveauRelance} le {dateFr(i.derniereRelanceDate)}</Text> : null}
                </View>
                {!i.garantieActivee ? <Bouton titre="Relancer" variante="marine" onPress={() => setRelance(i)} style={{ marginTop: 10 }} /> : <Text style={[ui.petit, { marginTop: 8 }]}>Garantie activée : {i.garantieActivee.type}</Text>}
              </Carte>
            );
          })}

          {d.assurances.length ? <Text style={ui.h2}>Assurances habitation</Text> : null}
          {d.assurances.map((x) => (
            <LigneAction
              key={x.key}
              icone="shield-checkmark-outline"
              titre={x.name}
              sous={`${x.situation === 'manquante' ? 'Attestation manquante' : x.situation === 'expiree' ? `Expirée le ${dateFr(x.echeance)}` : `Échéance le ${dateFr(x.echeance)}`}${x.ack ? ` · ${x.ack.note || 'traité'}` : ''}`}
              onPress={
                x.email
                  ? () =>
                      setMail({
                        t: x,
                        key: x.key,
                        sujet: 'Attestation d’assurance habitation',
                        texte: `Bonjour ${x.name},\n\nMerci de nous transmettre votre attestation d’assurance habitation à jour pour le logement situé ${x.adresse}.\n\nVous pouvez la déposer dans votre espace locataire ou répondre à ce message.\n\nCordialement,\nLe pôle gestion — Agence H Immobilier`,
                      })
                  : undefined
              }
            />
          ))}

          {d.irl.length ? <Text style={ui.h2}>Révisions de loyer (IRL)</Text> : null}
          {d.irl.map((x) => (
            <Carte key={x.key}>
              <Text style={{ fontWeight: '800', color: C.ink }}>{x.name}</Text>
              <Text style={ui.petit}>
                {x.adresse} · révision le {dateFr(x.dateRevision)}
                {x.enRetard ? ' · en retard' : ''}
              </Text>
              {x.proposition ? (
                <>
                  <Ligne libelle="Loyer actuel" valeur={eur2(x.loyerHC)} />
                  <Ligne libelle={`Nouveau loyer (${x.proposition.nouveau.label})`} valeur={eur2(x.proposition.nouveauLoyer)} gras />
                  {x.dpeBloque ? (
                    <Text style={[ui.petit, { color: C.danger, marginTop: 6 }]}>DPE F ou G : la révision n’est pas possible.</Text>
                  ) : (
                    <Bouton
                      titre="Appliquer la révision"
                      variante="marine"
                      onPress={() =>
                        lancer(
                          () =>
                            extranetPost('/api/gestion/alertes', {
                              action: 'appliquer-irl',
                              tenantAccountId: x.tenantAccountId,
                              nouveauLoyer: x.proposition!.nouveauLoyer,
                              indiceLabel: x.proposition!.nouveau.label,
                              indiceValeur: x.proposition!.nouveau.valeur,
                              dateRevision: x.dateRevision,
                              key: x.key,
                            }).then(a.charger),
                          'Révision appliquée.'
                        )
                      }
                      desactive={busy}
                      style={{ marginTop: 10 }}
                    />
                  )}
                </>
              ) : (
                <Text style={[ui.petit, { marginTop: 6 }]}>Indice du trimestre pas encore connu.</Text>
              )}
            </Carte>
          ))}

          {d.travaux.length ? <Text style={ui.h2}>Travaux et signalements</Text> : null}
          {d.travaux.map((t, i) => (
            <LigneAction key={`${t.titre}-${i}`} icone={t.urgent ? 'warning-outline' : 'construct-outline'} titre={t.titre} sous={`${t.name || t.adresse} · depuis ${t.joursOuvert} j${t.travauxLies ? ` · ${t.travauxLies.etapeLabel}` : ''}`} onPress={() => aller('travaux')} />
          ))}

          {d.anciens.length ? <Text style={ui.h2}>Anciens locataires</Text> : null}
          {d.anciens.map((x) => (
            <LigneAction key={x.accountId} icone="exit-outline" titre={x.name} sous={`Sorti le ${dateFr(x.dateSortie)}${x.du ? ` · reste dû ${eur2(x.du)}` : ''}${x.retard ? ' · dépôt de garantie en retard' : ''}`} />
          ))}
        </>
      ) : null}

      {/* Relance d'impayé */}
      <Feuille
        visible={!!relance}
        titre={`Relancer ${relance?.name || ''}`}
        onFermer={() => setRelance(null)}
        pied={
          <Bouton
            titre={busy ? 'Envoi…' : 'Envoyer la relance'}
            desactive={busy}
            onPress={() =>
              relance &&
              lancer(() => extranetPost('/api/gestion/alertes', { action: 'relancer-impaye', tenantAccountId: relance.tenantAccountId }).then(() => {
                setRelance(null);
                a.charger();
              }), 'Relance envoyée (ou ajoutée aux courriers à poster selon la fiche du locataire).')
            }
            style={{ flex: 1 }}
          />
        }
      >
        {relance ? (
          <>
            <Ligne libelle="Montant dû" valeur={eur2(relance.montantDu)} gras />
            <Ligne libelle="Périodes" valeur={relance.periodes.map((p) => p.periode).join(', ')} />
            <Ligne libelle="Relance suivante" valeur={`n°${(relance.niveauRelance || 0) + 1}`} />
            <Text style={[ui.petit, { marginTop: 10 }]}>Le texte de relance habituel de l’agence est utilisé, selon le niveau de relance.</Text>
          </>
        ) : null}
      </Feuille>

      {/* Email au locataire */}
      <Feuille
        visible={!!mail}
        titre={`Écrire à ${mail?.t.name || ''}`}
        onFermer={() => setMail(null)}
        pied={
          <Bouton
            titre={busy ? 'Envoi…' : 'Envoyer'}
            desactive={busy}
            onPress={() =>
              mail &&
              lancer(() => extranetPost('/api/gestion/alertes', { action: 'send-mail', key: mail.key, tenantAccountId: mail.t.tenantAccountId, subject: mail.sujet, text: mail.texte }).then(() => {
                setMail(null);
                a.charger();
              }), 'Email envoyé.')
            }
            style={{ flex: 1 }}
          />
        }
      >
        {mail ? (
          <>
            <Champ label="Objet" valeur={mail.sujet} onChange={(t) => setMail({ ...mail, sujet: t })} />
            <Champ label="Message" valeur={mail.texte} onChange={(t) => setMail({ ...mail, texte: t })} multiligne />
          </>
        ) : null}
      </Feuille>
    </Section>
  );
}
