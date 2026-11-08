import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Champ, Choix, Feuille } from '@/components/form';
import { Badge, Bouton, Carte, Vide, s as ui } from '@/components/ui';
import { useDonnees } from '@/espace/commun';
import { extranetPostForm, extranetRequete } from '@/lib/api';
import { choisirPhoto, pourFormData, prendrePhoto, type FichierJoint } from '@/lib/fichiers';
import { dateFr, eur } from '@/lib/format';
import { C } from '@/lib/theme';
import { Section, confirmer, useAction } from './outils';

// Publication des annonces sur le site : liste, statut (disponible, sous
// offre, vendu, loué), suppression, nouvelle annonce avec photos du téléphone.

type Annonce = { id: number; ref: string; type: string; title: string; city: string; price: number; surface: number; pieces: number; transaction_type: string; status: string; photos: string[]; createdByName: string; createdAt: string };
const STATUTS: [string, string][] = [
  ['disponible', 'Disponible'],
  ['sous_offre', 'Sous offre'],
  ['vendu', 'Vendu'],
  ['loue', 'Loué'],
];
const TYPES = ['Appartement', 'Maison', 'Studio', 'Local commercial', 'Bureau', 'Terrain', 'Parking', 'Immeuble'];

const vide = { type: 'Appartement', transaction_type: 'acquisition', title: '', city: 'Strasbourg', postal_code: '', quartier: '', adresse: '', surface: '', pieces: '', chambres: '', dpe: '', prixNetVendeur: '', honorairesPct: '', description: '', construction: 'ancien' };

export default function Publication() {
  const { data, erreur, chargement, charger } = useDonnees<{ listings: Annonce[] }>('/api/listings');
  const [form, setForm] = useState<typeof vide | null>(null);
  const [photos, setPhotos] = useState<FichierJoint[]>([]);
  const { busy, lancer } = useAction();
  const set = (k: keyof typeof vide, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const ajouterPhoto = async (camera: boolean) => {
    try {
      const p = camera ? await prendrePhoto() : await choisirPhoto();
      if (p) setPhotos((l) => [...l, p].slice(0, 12));
    } catch (e) {
      Alert.alert('Photo', (e as Error).message);
    }
  };
  const publier = () =>
    form &&
    lancer(async () => {
      if (!form.title.trim() || !form.city.trim()) throw new Error('Titre et ville obligatoires.');
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, String(v)));
      fd.append('price', form.prixNetVendeur);
      fd.append('honorairesApparents', form.transaction_type === 'location' ? 'false' : 'true');
      fd.append('details', '{}');
      photos.forEach((p) => fd.append('photos', pourFormData(p)));
      await extranetPostForm('/api/listings', fd);
      setForm(null);
      setPhotos([]);
      charger();
    }, 'Annonce publiée sur le site.');

  return (
    <Section
      titre="Publication"
      sous="Annonces publiées sur le site"
      chargement={chargement && !data}
      erreur={erreur}
      onRefresh={charger}
      action={<Bouton titre="Nouvelle annonce" variante="marine" onPress={() => setForm({ ...vide })} style={{ marginBottom: 12 }} />}
    >
      {data && !data.listings.length ? <Vide texte="Aucune annonce." /> : null}
      {(data?.listings || []).map((a) => (
        <Carte key={a.id} style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {a.photos[0] ? <Image source={{ uri: a.photos[0] }} style={{ width: 86, height: 86, borderRadius: 14 }} contentFit="cover" /> : <View style={{ width: 86, height: 86, borderRadius: 14, backgroundColor: C.line }} />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: C.ink }} numberOfLines={2}>
                {a.title}
              </Text>
              <Text style={ui.petit}>
                {a.ref} · {a.city} · {a.surface ? `${a.surface} m²` : ''}
              </Text>
              <Text style={{ fontWeight: '800', color: C.navy, marginTop: 2 }}>{eur(a.price)}</Text>
              <Text style={ui.petit}>
                {a.createdByName} · {dateFr(a.createdAt)}
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {STATUTS.map(([k, l]) => (
              <Pressable
                key={k}
                onPress={() => k !== a.status && lancer(() => extranetRequete('PATCH', `/api/listings/${a.id}`, { status: k }).then(charger))}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: a.status === k ? C.navy : C.lineStrong, backgroundColor: a.status === k ? C.navy : C.surface, marginRight: 6 }}
              >
                <Text style={{ fontWeight: '700', color: a.status === k ? '#fff' : C.ink, fontSize: 13 }}>{l}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => confirmer('Supprimer', `Supprimer l’annonce ${a.ref} ?`, () => lancer(() => extranetRequete('DELETE', `/api/listings/${a.id}`).then(charger)), 'Supprimer', true)} style={{ paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: C.danger, fontWeight: '700' }}>Supprimer</Text>
            </Pressable>
          </ScrollView>
          {a.status !== 'disponible' ? <Badge texte="Masquée sur le site" couleur={C.warn} fond={C.warnBg} /> : null}
        </Carte>
      ))}

      <Feuille
        visible={!!form}
        titre="Nouvelle annonce"
        onFermer={() => setForm(null)}
        pied={<Bouton titre={busy ? 'Publication…' : 'Publier'} onPress={publier} desactive={busy} style={{ flex: 1 }} />}
      >
        {form ? (
          <>
            <Choix label="Transaction" options={[['acquisition', 'Vente'], ['location', 'Location']]} valeur={form.transaction_type} onChange={(v) => set('transaction_type', v)} />
            <Choix label="Type" options={TYPES.map((t) => [t, t] as [string, string])} valeur={form.type} onChange={(v) => set('type', v)} defiler />
            <Champ label="Titre de l’annonce" valeur={form.title} onChange={(t) => set('title', t)} />
            <Champ label="Adresse" valeur={form.adresse} onChange={(t) => set('adresse', t)} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Champ label="Ville" valeur={form.city} onChange={(t) => set('city', t)} />
              </View>
              <View style={{ flex: 1 }}>
                <Champ label="Code postal" valeur={form.postal_code} onChange={(t) => set('postal_code', t)} clavier="number-pad" />
              </View>
            </View>
            <Champ label="Quartier" valeur={form.quartier} onChange={(t) => set('quartier', t)} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Champ label="Surface m²" valeur={form.surface} onChange={(t) => set('surface', t)} clavier="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Champ label="Pièces" valeur={form.pieces} onChange={(t) => set('pieces', t)} clavier="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Champ label="Chambres" valeur={form.chambres} onChange={(t) => set('chambres', t)} clavier="number-pad" />
              </View>
            </View>
            <Choix label="DPE" options={['', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].map((d) => [d, d || '—'] as [string, string])} valeur={form.dpe} onChange={(v) => set('dpe', v)} />
            <Champ label={form.transaction_type === 'location' ? 'Loyer (€ / mois)' : 'Prix net vendeur (€)'} valeur={form.prixNetVendeur} onChange={(t) => set('prixNetVendeur', t)} clavier="number-pad" />
            {form.transaction_type !== 'location' ? <Champ label="Honoraires (%)" valeur={form.honorairesPct} onChange={(t) => set('honorairesPct', t)} clavier="decimal-pad" /> : null}
            <Champ label="Description" valeur={form.description} onChange={(t) => set('description', t)} multiligne />
            <Text style={ui.lib}>Photos ({photos.length}/12)</Text>
            <ScrollView horizontal style={{ marginBottom: 10 }}>
              {photos.map((p, i) => (
                <Pressable key={p.uri} onLongPress={() => setPhotos((l) => l.filter((_, j) => j !== i))}>
                  <Image source={{ uri: p.uri }} style={{ width: 84, height: 84, borderRadius: 12, marginRight: 8 }} />
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Bouton titre="Prendre une photo" variante="contour" onPress={() => ajouterPhoto(true)} style={{ flex: 1 }} />
              <Bouton titre="Galerie" variante="contour" onPress={() => ajouterPhoto(false)} style={{ flex: 1 }} />
            </View>
            <Text style={[ui.petit, { marginTop: 6 }]}>Appui long sur une photo pour la retirer. L’annonce est visible sur le site dès sa publication.</Text>
          </>
        ) : null}
      </Feuille>
    </Section>
  );
}
