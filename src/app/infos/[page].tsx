import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bouton, Carte, Ecran, s as ui } from '@/components/ui';
import { AGENCE, C } from '@/lib/theme';

// Pages d'information (mêmes textes que le site) : domiciliation, gestion
// locative, agence, recrutement, contact, mentions légales.

type Bloc = { titre?: string; texte?: string; points?: string[]; etapes?: [string, string][] };
type Page = { kicker: string; titre: string; intro: string; blocs: Bloc[]; action?: { titre: string; sujet: string }; prix?: [string, string] };

const PAGES: Record<string, Page> = {
  domiciliation: {
    kicker: 'DOMICILIATION D’ENTREPRISE · STRASBOURG',
    titre: 'Votre courrier, où que vous soyez.',
    intro:
      'Domiciliez le siège social de votre société au 21 rue Sellénick, à Strasbourg. Chaque courrier reçu est numérisé, daté et déposé dans votre espace : vous le lisez en PDF depuis votre téléphone, comme vos emails.',
    prix: ['65 € HT', 'par mois'],
    blocs: [
      {
        titre: 'De la boîte aux lettres à votre écran',
        etapes: [
          ['Réception', 'Votre courrier arrive au 21 rue Sellénick.'],
          ['Numérisation', 'Il est scanné en PDF et daté le jour même.'],
          ['Notification', 'Vous êtes prévenu par email.'],
          ['Lecture', 'Vous le lisez dans votre espace client.'],
          ['Retrait', 'L’original vous attend à l’agence.'],
        ],
      },
      { texte: 'Les originaux sont à retirer à l’agence, 21 rue Sellénick, du lundi au vendredi de 9 h à 18 h (pas de réexpédition postale).' },
      { titre: 'Votre courrier, comme une boîte email', points: ['Chaque courrier en PDF', 'Daté et classé (date, expéditeur, objet)', 'Archivez à votre rythme', 'Rien n’est jamais supprimé', 'Vos documents : attestation de domiciliation et contrat'] },
      { titre: 'Pour qui ?', texte: 'SCI, SARL et autres structures, avec un interlocuteur unique à l’agence.' },
    ],
    action: { titre: 'Souscrire', sujet: 'Domiciliation d’entreprise' },
  },
  'gestion-locative': {
    kicker: 'GESTION LOCATIVE · STRASBOURG',
    titre: 'Votre patrimoine, dans votre poche.',
    intro:
      'Vous nous confiez votre bien, nous nous occupons de tout. Et vous suivez tout en temps réel depuis votre espace propriétaire : loyers versés, courbes, alertes, travaux en cours et leur avancement, documents.',
    blocs: [
      { titre: 'Votre espace propriétaire', points: ['Les loyers en temps réel', 'Vos courbes : loyers encaissés, taux d’occupation', 'Les problèmes, tout de suite', 'Les travaux, étape par étape', 'Tous vos documents : bail, état des lieux, quittances, diagnostics, assurances, relevés', 'Un interlocuteur dédié'] },
      { titre: 'Les travaux, étape par étape', etapes: [['Signalement', ''], ['Devis', 'Plusieurs artisans comparés'], ['Artisan retenu', ''], ['Intervention', ''], ['Terminé', '']] },
      {
        titre: 'Notre gestion, au quotidien',
        points: ['Mise en location : annonce, visites, vérification des dossiers, bail', 'Suivi : encaissement des loyers, quittances, régularisation des charges', 'Entretien : interventions, états des lieux d’entrée et de sortie', 'Accompagnement : un interlocuteur unique'],
      },
      { texte: 'Un tarif adapté à votre bien, sur simple demande auprès de notre pôle gestion.' },
    ],
    action: { titre: 'Demander un tarif', sujet: 'Gestion locative — demande de tarif' },
  },
  agence: {
    kicker: 'L’AGENCE · STRASBOURG',
    titre: 'Agence H Immobilier',
    intro:
      'Agence indépendante installée au 21 rue Sellénick, dans le quartier des Contades, Agence H Immobilier accompagne depuis 2022 les particuliers et les investisseurs à Strasbourg, dans l’Eurométropole et en Alsace : achat, vente, location, gestion locative, programme neuf et domiciliation d’entreprise.',
    blocs: [
      { titre: 'Investir à Strasbourg en toute sérénité', etapes: [['Stratégie', 'Budget, financement, rendement'], ['Sélection du bien', ''], ['Sécuriser l’achat', 'Diagnostics, notaire, négociation'], ['Louer et gérer', '']] },
      {
        titre: 'Votre investissement, protégé',
        points: ['Dossiers locataires vérifiés', 'Garantie loyers impayés possible : Visale, Garantme ou garant physique', 'Relances automatiques dès le 5 du mois, jusqu’au commandement de payer si besoin', 'Travaux mis en concurrence par appel d’offres', 'Relevé de compte chaque mois et suivi en temps réel'],
      },
      { titre: 'Nos métiers', points: ['Achat et vente', 'Location', 'Gestion locative', 'Investissement locatif', 'Programme neuf : Les Jardins de la Sauer à Wœrth, en exclusivité', 'Domiciliation'] },
      { titre: 'Secteurs', texte: 'Contades, Neustadt, Petite France, Krutenau, Esplanade, Robertsau, Neudorf ; Schiltigheim, Bischheim, Illkirch-Graffenstaden, Lingolsheim ; Alsace du Nord (Wœrth).' },
    ],
    action: { titre: 'Parler de mon projet', sujet: 'Projet immobilier' },
  },
  recrutement: {
    kicker: 'NOUS RECRUTONS',
    titre: 'Rejoignez Agence H',
    intro: 'L’agence recherche des agents commerciaux indépendants à Strasbourg, pour la transaction et pour la mise en location des biens de ses clients propriétaires.',
    blocs: [
      { points: ['Transaction : de l’estimation à la signature chez le notaire, à Strasbourg et dans l’Eurométropole', 'Mise en location : annonce, visites, dossier locataire', 'Statut d’agent commercial indépendant, sous mandat d’Agence H'] },
      { titre: 'Ce que nous proposons', points: ['Une formation aux outils et méthodes', 'Un portefeuille de biens et de contacts locaux', 'Une équipe à taille humaine', 'Une rémunération basée sur les honoraires générés par vos dossiers'] },
    ],
    action: { titre: 'Postuler', sujet: 'Candidature agent commercial' },
  },
  contact: {
    kicker: 'CONTACT',
    titre: 'Nous contacter',
    intro: `${AGENCE.adresse} (${AGENCE.quartier}). ${AGENCE.horaires}.`,
    blocs: [],
  },
  mentions: {
    kicker: 'MENTIONS LÉGALES',
    titre: 'Agence H Immobilier',
    intro: 'SAS au capital de 1 000 €, créée en 2022.',
    blocs: [
      {
        points: [
          '949 437 750 R.C.S. Strasbourg',
          `Siège : ${AGENCE.adresse}`,
          'Cartes professionnelles Transaction et Gestion immobilière n° CPI 6901 2023 000 000 043 (CCI Strasbourg Métropole)',
          'Garantie financière GALIAN n° 949437750 : 120 000 €',
          `${AGENCE.telephone} · ${AGENCE.email}`,
        ],
      },
    ],
  },
};

export default function PageInfos() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const p = PAGES[String(page)] || PAGES.agence;
  const ecrire = (sujet: string) => Linking.openURL(`mailto:${AGENCE.email}?subject=${encodeURIComponent(sujet)}`);

  return (
    <Ecran basExtra={30}>
      <Pressable onPress={() => router.back()} style={st.retour}>
        <Ionicons name="chevron-back" size={22} color={C.navy} />
        <Text style={{ color: C.navy, fontWeight: '700' }}>Retour</Text>
      </Pressable>
      <Text style={st.kicker}>{p.kicker}</Text>
      <Text style={st.titre}>{p.titre}</Text>
      <View style={ui.trait} />
      <Text style={[ui.texte, { marginTop: 12 }]}>{p.intro}</Text>
      {p.prix ? (
        <Carte style={{ marginTop: 16, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: C.navy, fontFamily: 'serif' }}>{p.prix[0]}</Text>
          <Text style={ui.petit}>{p.prix[1]}</Text>
        </Carte>
      ) : null}

      {p.blocs.map((b, i) => (
        <View key={i}>
          {b.titre ? <Text style={ui.h2}>{b.titre}</Text> : <View style={{ height: 14 }} />}
          {b.texte ? <Text style={ui.texte}>{b.texte}</Text> : null}
          {b.points?.map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={19} color={C.brass} style={{ marginTop: 1 }} />
              <Text style={[ui.texte, { flex: 1 }]}>{t}</Text>
            </View>
          ))}
          {b.etapes?.map(([t, d], j) => (
            <View key={t} style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
              <View style={st.num}>
                <Text style={st.numTxt}>{j + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15 }}>{t}</Text>
                {d ? <Text style={ui.petit}>{d}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ))}

      {page === 'contact' || p.action ? (
        <Carte style={{ marginTop: 20 }}>
          <Pressable style={st.contact} onPress={() => Linking.openURL(`tel:${AGENCE.tel}`)}>
            <Ionicons name="call" size={20} color={C.brass} />
            <Text style={st.contactTxt}>{AGENCE.telephone}</Text>
          </Pressable>
          <Pressable style={st.contact} onPress={() => ecrire(p.action ? p.action.sujet : 'Contact')}>
            <Ionicons name="mail" size={20} color={C.brass} />
            <Text style={st.contactTxt}>{AGENCE.email}</Text>
          </Pressable>
          <Pressable style={st.contact} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(AGENCE.adresse)}`)}>
            <Ionicons name="location" size={20} color={C.brass} />
            <Text style={st.contactTxt}>{AGENCE.adresse}</Text>
          </Pressable>
          {p.action ? (
            <Bouton
              titre={p.action.titre}
              onPress={() =>
                page === 'domiciliation'
                  ? router.push('/reserver/domiciliation')
                  : router.push({ pathname: '/contact', params: { sujet: page === 'gestion-locative' ? 'Gestion locative' : 'Autre demande', message: p.action!.sujet } })
              }
              style={{ marginTop: 12 }}
            />
          ) : null}
          {page === 'contact' ? <Bouton titre="Nous écrire" onPress={() => router.push('/contact')} style={{ marginTop: 12 }} /> : null}
        </Carte>
      ) : null}
    </Ecran>
  );
}

const st = StyleSheet.create({
  retour: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 12, alignSelf: 'flex-start' },
  kicker: { color: C.brass, fontSize: 11.5, fontWeight: '800', letterSpacing: 1.1 },
  titre: { fontSize: 28, fontWeight: '800', color: C.ink, fontFamily: 'serif', marginTop: 4 },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  numTxt: { color: C.brassLight, fontWeight: '800' },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  contactTxt: { fontSize: 15.5, color: C.ink, fontWeight: '600', flex: 1 },
});
