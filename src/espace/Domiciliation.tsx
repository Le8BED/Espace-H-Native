import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Carte, Chargement, Ecran, Message, Vide, s as ui } from '@/components/ui';
import { extranetPost } from '@/lib/api';
import { dateFr } from '@/lib/format';
import { AGENCE, C } from '@/lib/theme';
import { BarreEspace, Documents, EnteteEspace, ouvrir, useDonnees, type Onglet } from './commun';

// Espace domiciliation natif : Courrier · Archives · Documents · Menu.

type Courrier = { id: number; dateReception: string; expediteur: string; objet: string; recommande: boolean; fichierNom: string; mime: string; luLe: string | null; archive: boolean; retireLe: string | null };

const ONGLETS: Onglet[] = [
  { key: 'courrier', label: 'Courrier', icone: 'mail-outline' },
  { key: 'archives', label: 'Archives', icone: 'archive-outline' },
  { key: 'documents', label: 'Documents', icone: 'folder-outline' },
];

function ListeCourrier({ archives }: { archives: boolean }) {
  const { data, erreur, chargement, charger, setData } = useDonnees<{ courriers: Courrier[] }>('/api/domiciliation/courrier');
  const [ouvre, setOuvre] = useState<number | null>(null);
  const liste = (data?.courriers || []).filter((c) => !!c.archive === archives);
  const nonLus = (data?.courriers || []).filter((c) => !c.luLe && !c.archive).length;

  const lire = async (c: Courrier) => {
    setOuvre(c.id);
    const ext = (c.fichierNom.split('.').pop() || 'pdf').toLowerCase();
    await ouvrir(`/api/domiciliation/courrier?fichier=${c.id}&telecharger=1`, `Courrier-${dateFr(c.dateReception)}-${c.expediteur}.${ext}`);
    setOuvre(null);
    if (!c.luLe && data) setData({ courriers: data.courriers.map((x) => (x.id === c.id ? { ...x, luLe: new Date().toISOString() } : x)) });
  };
  const archiver = async (c: Courrier) => {
    try {
      await extranetPost('/api/domiciliation/courrier', { action: 'archiver', id: c.id, archive: !c.archive });
      charger();
    } catch {
      /* rien */
    }
  };

  return (
    <Ecran onRefresh={charger} refreshing={chargement && !!data} basExtra={150}>
      <EnteteEspace titre={archives ? 'Archives' : 'Mon courrier'} sous={archives ? 'Courriers archivés (rien n’est jamais supprimé)' : nonLus ? `${nonLus} courrier${nonLus > 1 ? 's' : ''} non lu${nonLus > 1 ? 's' : ''}` : 'Votre courrier numérisé'} />
      {erreur ? <Message type="erreur" texte={erreur} action="Réessayer" onAction={charger} /> : null}
      {chargement && !data ? <Chargement /> : null}
      {data && !liste.length ? <Vide texte={archives ? 'Aucun courrier archivé.' : 'Aucun courrier pour le moment.'} /> : null}
      {liste.map((c) => (
        <Carte key={c.id} onPress={() => lire(c)} style={[{ padding: 14 }, !c.luLe && { borderColor: C.brass, borderWidth: 1.5 }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[st.icone, !c.luLe && { backgroundColor: C.navy }]}>
              <Ionicons name={c.recommande ? 'ribbon' : 'mail'} size={21} color={!c.luLe ? C.brassLight : C.brass} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ color: C.ink, fontSize: 15.5 }, !c.luLe ? { fontWeight: '800' } : { fontWeight: '600' }]} numberOfLines={1}>
                {c.expediteur || 'Expéditeur inconnu'}
              </Text>
              <Text style={ui.petit} numberOfLines={1}>
                {c.objet || 'Courrier'} · {dateFr(c.dateReception)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {c.recommande ? <Badge texte="Recommandé" couleur={C.danger} fond={C.dangerBg} /> : null}
                {c.retireLe ? <Badge texte={`Retiré le ${dateFr(c.retireLe)}`} couleur={C.ok} fond={C.okBg} /> : <Badge texte="Original à l’agence" />}
              </View>
            </View>
            <Pressable onPress={() => archiver(c)} hitSlop={10} accessibilityLabel={c.archive ? 'Désarchiver' : 'Archiver'}>
              <Ionicons name={c.archive ? 'arrow-undo-outline' : 'archive-outline'} size={22} color={C.inkSoft} />
            </Pressable>
          </View>
          {ouvre === c.id ? <Text style={[ui.petit, { marginTop: 6 }]}>Ouverture…</Text> : null}
        </Carte>
      ))}
      {!archives ? <Text style={[ui.petit, { marginTop: 8 }]}>Les originaux sont à retirer à l’agence, {AGENCE.adresse}, du lundi au vendredi de 9 h à 18 h.</Text> : null}
    </Ecran>
  );
}

export default function Domiciliation() {
  const [onglet, setOnglet] = useState('courrier');
  const ecran = onglet === 'archives' ? <ListeCourrier archives /> : onglet === 'documents' ? <Documents /> : <ListeCourrier archives={false} />;
  return (
    <View style={{ flex: 1 }}>
      {ecran}
      <BarreEspace onglets={ONGLETS} actif={onglet} onChoisir={setOnglet} menu={[]} />
    </View>
  );
}

const st = StyleSheet.create({
  icone: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fbf6ea', alignItems: 'center', justifyContent: 'center' },
});
