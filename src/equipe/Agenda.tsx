import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { ChoixJour, dateLongue, iso } from '@/components/dates';
import { Champ, Choix, Feuille, LigneAction } from '@/components/form';
import { Bouton, Vide, s as ui } from '@/components/ui';
import { useDonnees } from '@/espace/commun';
import { extranetPost, extranetRequete } from '@/lib/api';
import { C } from '@/lib/theme';
import { Onglets, Section, confirmer, useAction } from './outils';

// Agenda de l'agence (commun ou personnel) : rendez-vous des 3 prochaines
// semaines (y compris domiciliation et VEFA), ajout et suppression.

type Ev = { id: string | number; source: string; category: string; typeLabel: string; title: string; date: string; startTime: string; endTime: string | null; notes: string; contactNom?: string; contactPrenom?: string; contactPhone?: string };
const CATS: [string, string][] = [
  ['transaction', 'Transaction'],
  ['location', 'Location'],
  ['gestion', 'Gestion'],
  ['domiciliation', 'Domiciliation'],
  ['autre', 'Autre'],
];
const COUL: Record<string, string> = { transaction: '#1c4f8a', location: '#0f766e', gestion: '#6b3fa0', domiciliation: '#c8962c', vefa: '#92400e', autre: '#6b7280' };

export default function Agenda() {
  const [perso, setPerso] = useState<'commun' | 'moi'>('commun');
  const jours = useMemo(() => {
    const l: string[] = [];
    const d = new Date();
    for (let i = 0; i < 21; i++) {
      l.push(iso(d));
      d.setDate(d.getDate() + 1);
    }
    return l;
  }, []);
  const [jour, setJour] = useState(jours[0]);
  const { data, erreur, chargement, charger } = useDonnees<{ byDate: Record<string, Ev[]> }>(`/api/agenda?from=${jours[0]}&to=${jours[jours.length - 1]}${perso === 'moi' ? '&owner=me' : ''}`);
  const [nouveau, setNouveau] = useState<{ category: string; title: string; date: string; startTime: string; endTime: string; notes: string } | null>(null);
  const { busy, lancer } = useAction();
  const evs = data?.byDate?.[jour] || [];

  return (
    <Section
      titre="Agenda"
      chargement={chargement && !data}
      erreur={erreur}
      onRefresh={charger}
      action={<Bouton titre="Ajouter un rendez-vous" variante="marine" onPress={() => setNouveau({ category: 'transaction', title: '', date: jour, startTime: '10:00', endTime: '11:00', notes: '' })} style={{ marginBottom: 12 }} />}
    >
      <Onglets
        options={[
          ['commun', 'Agenda de l’agence'],
          ['moi', 'Mon agenda'],
        ]}
        valeur={perso}
        onChange={setPerso}
      />
      <ChoixJour jours={jours} valeur={jour} onChange={setJour} />
      <Text style={[ui.h2, { marginTop: 0, textTransform: 'capitalize' }]}>{dateLongue(jour)}</Text>
      {data && !evs.length ? <Vide texte="Aucun rendez-vous ce jour-là." /> : null}
      {evs.map((e) => (
        <LigneAction
          key={String(e.id)}
          icone="time-outline"
          titre={`${e.startTime}${e.endTime ? `–${e.endTime}` : ''} · ${e.title}`}
          sous={`${e.typeLabel || e.category}${e.contactPrenom || e.contactNom ? ` · ${e.contactPrenom || ''} ${e.contactNom || ''}` : ''}${e.contactPhone ? ` · ${e.contactPhone}` : ''}${e.notes ? ` · ${e.notes}` : ''}`}
          onPress={e.source === 'manuel' ? () => confirmer('Supprimer', `Supprimer « ${e.title} » ?`, () => lancer(() => extranetRequete('DELETE', `/api/agenda/${e.id}`).then(charger)), 'Supprimer', true) : undefined}
          droite={<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COUL[e.category] || C.inkSoft }} />}
        />
      ))}
      <Feuille
        visible={!!nouveau}
        titre="Nouveau rendez-vous"
        onFermer={() => setNouveau(null)}
        pied={
          <Bouton
            titre={busy ? '…' : 'Enregistrer'}
            desactive={busy || !nouveau?.title}
            onPress={() =>
              nouveau &&
              lancer(async () => {
                await extranetPost('/api/agenda', { ...nouveau, endTime: nouveau.endTime || undefined, owner: perso === 'moi' ? 'me' : undefined });
                setNouveau(null);
                charger();
              }, 'Rendez-vous ajouté.')
            }
            style={{ flex: 1 }}
          />
        }
      >
        {nouveau ? (
          <>
            <Choix label="Pôle" options={CATS} valeur={nouveau.category} onChange={(v) => setNouveau({ ...nouveau, category: v })} />
            <Champ label="Titre" valeur={nouveau.title} onChange={(t) => setNouveau({ ...nouveau, title: t })} />
            <Champ label="Date (AAAA-MM-JJ)" valeur={nouveau.date} onChange={(t) => setNouveau({ ...nouveau, date: t })} clavier="numbers-and-punctuation" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Champ label="Début (HH:MM)" valeur={nouveau.startTime} onChange={(t) => setNouveau({ ...nouveau, startTime: t })} clavier="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Champ label="Fin (HH:MM)" valeur={nouveau.endTime} onChange={(t) => setNouveau({ ...nouveau, endTime: t })} clavier="numbers-and-punctuation" />
              </View>
            </View>
            <Champ label="Notes" valeur={nouveau.notes} onChange={(t) => setNouveau({ ...nouveau, notes: t })} multiligne />
          </>
        ) : null}
      </Feuille>
    </Section>
  );
}
