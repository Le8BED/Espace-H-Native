import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bouton, Carte, Chargement, Ecran, Ligne, Message, Vide, s as ui } from '@/components/ui';
import { extranetGet, extranetPost, ouvrirDocument } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFlip } from '@/lib/flip';
import { dateFr, initiales } from '@/lib/format';
import { AGENCE, C, ombre } from '@/lib/theme';

// Pièces communes de l'espace client : barre d'onglets (4 + Menu), en-tête,
// pastille de retour au site, documents, paiement, syndic, mes informations.

export type Onglet = { key: string; label: string; icone: keyof typeof Ionicons.glyphMap; badge?: number };

// Chargement d'une ressource de l'extranet avec rechargement (tirer vers le bas)
export function useDonnees<T>(chemin: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(!!chemin);
  const charger = useCallback(async () => {
    if (!chemin) return;
    setChargement(true);
    setErreur('');
    try {
      setData(await extranetGet<T>(chemin));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, [chemin]);
  useEffect(() => {
    charger();
  }, [charger]);
  return { data, erreur, chargement, charger, setData };
}

export async function ouvrir(chemin: string, nom: string) {
  try {
    await ouvrirDocument(chemin, nom);
  } catch (e) {
    Alert.alert('Document', (e as Error).message || 'Ouverture impossible');
  }
}

export function EnteteEspace({ titre, sous }: { titre: string; sous?: string }) {
  const { user } = useAuth();
  return (
    <View style={st.entete}>
      <View style={{ flex: 1 }}>
        <Text style={st.bonjour}>Bonjour {user?.name.split(' ')[0]}</Text>
        <Text style={st.enteteTitre}>{titre}</Text>
        {sous ? <Text style={ui.petit}>{sous}</Text> : null}
      </View>
      <View style={st.avatar}>
        <Text style={st.avatarTxt}>{initiales(user?.name)}</Text>
      </View>
    </View>
  );
}

const PASTILLE: Record<string, [string, string]> = {
  proprietaire: ['Passer en mode acquéreur', '/?mode=achat'],
  locataire: ['Passer en mode locataire', '/?mode=location'],
};

export function BarreEspace({ onglets, actif, onChoisir, menu }: { onglets: Onglet[]; actif: string; onChoisir: (k: string) => void; menu: Onglet[] }) {
  const ins = useSafeAreaInsets();
  const { user, deconnecter } = useAuth();
  const { basculer } = useFlip();
  const [ouvert, setOuvert] = useState(false);
  const [texte, cible] = PASTILLE[String(user?.role)] || ['Passer au site de l’agence', '/'];
  const actifMenu = menu.some((m) => m.key === actif);

  const choisir = (k: string) => {
    setOuvert(false);
    onChoisir(k);
  };
  const sortir = () => basculer(() => router.replace(cible as any));
  const seDeconnecter = () =>
    Alert.alert('Se déconnecter', 'Voulez-vous vous déconnecter de votre espace client ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          setOuvert(false);
          basculer(async () => {
            await deconnecter();
            router.replace('/menu');
          });
        },
      },
    ]);

  return (
    <>
      <Pressable onPress={sortir} style={[st.pastille, { bottom: 76 + Math.max(ins.bottom, 8) }]}>
        <Text style={{ color: C.brassLight, fontSize: 17 }}>⇄</Text>
        <Text style={st.pastilleTxt}>{texte}</Text>
      </Pressable>

      <View style={[st.barre, { paddingBottom: Math.max(ins.bottom, 8) }]}>
        {onglets.slice(0, 4).map((o) => {
          const a = actif === o.key && !ouvert;
          return (
            <Pressable key={o.key} style={st.onglet} onPress={() => choisir(o.key)}>
              <View>
                <Ionicons name={o.icone} size={23} color={a ? C.brassLight : 'rgba(255,255,255,0.72)'} />
                {o.badge ? <Text style={st.pastilleRouge}>{o.badge}</Text> : null}
              </View>
              <Text style={[st.ongletTxt, a && { color: C.brassLight }]} numberOfLines={1}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable style={st.onglet} onPress={() => setOuvert(true)}>
          <Ionicons name="menu" size={24} color={ouvert || actifMenu ? C.brassLight : 'rgba(255,255,255,0.72)'} />
          <Text style={[st.ongletTxt, (ouvert || actifMenu) && { color: C.brassLight }]}>Menu</Text>
        </Pressable>
      </View>

      <Modal visible={ouvert} transparent animationType="slide" onRequestClose={() => setOuvert(false)}>
        <Pressable style={st.voile} onPress={() => setOuvert(false)}>
          <Pressable style={[st.panneau, { paddingBottom: ins.bottom + 20 }]} onPress={() => {}}>
            <View style={st.poignee} />
            <View style={st.grille}>
              {menu.map((m) => (
                <Pressable key={m.key} style={[st.tuile, actif === m.key && st.tuileActive]} onPress={() => choisir(m.key)}>
                  <Ionicons name={m.icone} size={26} color={C.navy} />
                  <Text style={st.tuileTxt}>{m.label}</Text>
                  {m.badge ? <Text style={[st.pastilleRouge, { top: 8, right: 10 }]}>{m.badge}</Text> : null}
                </Pressable>
              ))}
              <Pressable style={st.tuile} onPress={() => Linking.openURL(`tel:${AGENCE.tel}`)}>
                <Ionicons name="call-outline" size={26} color={C.navy} />
                <Text style={st.tuileTxt}>Appeler l’agence</Text>
              </Pressable>
            </View>
            <Pressable onPress={seDeconnecter} style={st.deco}>
              <Text style={st.decoTxt}>Se déconnecter</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------- Documents ----------
type Doc = { id: number; direction: string; label: string; category: string; filename: string; mimeType: string; status: string; createdAt: string };
export function Documents() {
  const { data, erreur, chargement, charger } = useDonnees<{ documents: Doc[] }>('/api/documents');
  const docs = data?.documents || [];
  return (
    <Ecran onRefresh={charger} refreshing={chargement && !!data} basExtra={150}>
      <EnteteEspace titre="Mes documents" sous="Documents transmis par l’agence et par vous" />
      {erreur ? <Message type="erreur" texte={erreur} action="Réessayer" onAction={charger} /> : null}
      {chargement && !data ? <Chargement /> : null}
      {data && !docs.length ? <Vide texte="Aucun document pour le moment." /> : null}
      {docs.map((d) => (
        <Carte key={d.id} onPress={() => ouvrir(`/api/documents/download?id=${d.id}`, d.filename || `${d.label}.pdf`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={st.docIcone}>
            <Ionicons name={/pdf/.test(d.mimeType) ? 'document-text' : /image/.test(d.mimeType) ? 'image' : 'document'} size={22} color={C.brass} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: C.ink, fontSize: 15 }} numberOfLines={2}>
              {d.label || d.filename}
            </Text>
            <Text style={ui.petit}>
              {d.category ? `${d.category} · ` : ''}
              {dateFr(d.createdAt)} · {d.direction === 'client_agence' ? 'envoyé par vous' : 'de l’agence'}
            </Text>
          </View>
          <Ionicons name="download-outline" size={22} color={C.inkSoft} />
        </Carte>
      ))}
    </Ecran>
  );
}

// ---------- Paiement (RIB du compte de gestion) ----------
export function Paiement({ libelle }: { libelle?: string }) {
  const { data, erreur, chargement, charger } = useDonnees<{ rib: { titulaire: string; iban: string; bic: string } | null; pdf: boolean }>('/api/rib-gestion');
  return (
    <Ecran onRefresh={charger} basExtra={150}>
      <EnteteEspace titre="Paiement" sous="Coordonnées bancaires du compte de gestion de l’agence" />
      {erreur ? <Message type="erreur" texte={erreur} /> : null}
      {chargement && !data ? <Chargement /> : null}
      {data?.rib ? (
        <Carte>
          <Ligne libelle="Titulaire" valeur={data.rib.titulaire} />
          <Ligne libelle="IBAN" valeur={data.rib.iban.replace(/(.{4})/g, '$1 ').trim()} />
          <Ligne libelle="BIC" valeur={data.rib.bic} />
          {libelle ? <Ligne libelle="Libellé du virement" valeur={libelle} /> : null}
          {data.pdf ? <Bouton titre="Télécharger le RIB (PDF)" variante="marine" onPress={() => ouvrir('/api/rib-gestion?pdf=1', 'RIB-gestion-Agence-H.pdf')} style={{ marginTop: 14 }} /> : null}
        </Carte>
      ) : null}
      <Message texte="Effectuez vos règlements uniquement sur ce compte. En cas de doute, appelez l’agence avant tout virement." />
    </Ecran>
  );
}

// ---------- Syndic ----------
export type Syndic = { nom?: string; gestionnaire?: string; telephone?: string; urgence?: string; email?: string; adresse?: string; site?: string; reference?: string; notes?: string } | null;
export function CarteSyndic({ syndic, adresse }: { syndic: Syndic; adresse?: string }) {
  return (
    <Carte>
      {adresse ? <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 6 }}>{adresse}</Text> : null}
      {!syndic || !syndic.nom ? (
        <Text style={ui.petit}>Les coordonnées du syndic ne sont pas encore renseignées. L’agence reste votre interlocuteur.</Text>
      ) : (
        <>
          <Ligne libelle="Syndic" valeur={syndic.nom} />
          {syndic.gestionnaire ? <Ligne libelle="Gestionnaire" valeur={syndic.gestionnaire} /> : null}
          {syndic.reference ? <Ligne libelle="Référence" valeur={syndic.reference} /> : null}
          {syndic.adresse ? <Ligne libelle="Adresse" valeur={syndic.adresse} /> : null}
          {syndic.notes ? <Text style={[ui.petit, { marginTop: 8 }]}>{syndic.notes}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {syndic.telephone ? <Bouton titre="Appeler" variante="marine" onPress={() => Linking.openURL(`tel:${syndic.telephone!.replace(/\s/g, '')}`)} style={{ flexGrow: 1 }} /> : null}
            {syndic.urgence ? <Bouton titre="Urgence" variante="danger" onPress={() => Linking.openURL(`tel:${syndic.urgence!.replace(/\s/g, '')}`)} style={{ flexGrow: 1 }} /> : null}
            {syndic.email ? <Bouton titre="Écrire" variante="contour" onPress={() => Linking.openURL(`mailto:${syndic.email}`)} style={{ flexGrow: 1 }} /> : null}
          </View>
        </>
      )}
    </Carte>
  );
}

// ---------- Mes informations (complétées une seule fois) ----------
type Champ = { k: string; label: string; options: string[] | null; valeur: string; rempli: boolean; source: { par: string; le: string } | null };
export function MesInformations() {
  const { data, erreur, chargement, charger, setData } = useDonnees<{ name: string; email: string; champs: Champ[] }>('/api/mes-infos');
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');
  const vides = (data?.champs || []).filter((c) => !c.rempli);
  const saisis = Object.entries(form).filter(([, v]) => v.trim());

  const enregistrer = () =>
    Alert.alert('Enregistrer', 'Une fois enregistrées, ces informations ne pourront plus être modifiées que par l’agence.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Enregistrer',
        onPress: async () => {
          setBusy(true);
          setErr('');
          try {
            const r = await extranetPost('/api/mes-infos', Object.fromEntries(saisis));
            setData(r);
            setForm({});
            setOk('Merci, vos informations sont enregistrées. L’agence en est informée.');
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <Ecran onRefresh={charger} basExtra={150}>
      <EnteteEspace titre="Mes informations" />
      {erreur ? <Message type="erreur" texte={erreur} /> : null}
      {chargement && !data ? <Chargement /> : null}
      {ok ? <Message type="ok" texte={ok} /> : null}
      {err ? <Message type="erreur" texte={err} /> : null}
      {data ? (
        <Carte>
          <Ligne libelle="Nom" valeur={data.name} />
          <Ligne libelle="Email" valeur={data.email} />
          {data.champs.map((c) =>
            c.rempli ? (
              <View key={c.k} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingVertical: 9 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={ui.ligneLib}>🔒 {c.label}</Text>
                  <Text style={[ui.ligneVal]}>{c.valeur}</Text>
                </View>
                {c.source ? <Text style={[ui.petit, { textAlign: 'right' }]}>{c.source.par === 'client' ? 'renseigné par vous' : 'renseigné par l’agence'} le {dateFr(c.source.le)}</Text> : null}
              </View>
            ) : (
              <View key={c.k} style={{ paddingVertical: 8 }}>
                <Text style={[ui.ligneLib, { marginBottom: 6 }]}>{c.label}</Text>
                {c.options ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {c.options.map((o) => (
                      <Pressable key={o} onPress={() => setForm((f) => ({ ...f, [c.k]: o }))} style={[st.puce, form[c.k] === o && st.puceActive]}>
                        <Text style={[{ fontWeight: '700', color: C.ink }, form[c.k] === o && { color: '#fff' }]}>{o}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <TextInput value={form[c.k] || ''} onChangeText={(t) => setForm((f) => ({ ...f, [c.k]: t }))} placeholder="à compléter" placeholderTextColor="#9aa3ae" keyboardType={/telephone/.test(c.k) ? 'phone-pad' : 'default'} style={st.champ} />
                )}
              </View>
            )
          )}
          {vides.length ? <Bouton titre={busy ? 'Enregistrement…' : 'Enregistrer mes informations'} onPress={enregistrer} desactive={busy || !saisis.length} style={{ marginTop: 14 }} /> : null}
        </Carte>
      ) : null}
      <Text style={ui.petit}>🔒 Pour modifier une information déjà renseignée, contactez l’agence ({AGENCE.telephone}).</Text>
    </Ecran>
  );
}

export function Encadre({ children, couleur = C.navy }: { children: ReactNode; couleur?: string }) {
  return <View style={[st.encadre, { borderLeftColor: couleur }]}>{children}</View>;
}

const st = StyleSheet.create({
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 4 },
  bonjour: { color: C.brass, fontWeight: '800', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  enteteTitre: { fontSize: 28, fontWeight: '800', color: C.ink, fontFamily: 'serif' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.navy, borderWidth: 2, borderColor: C.brass, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: C.brassLight, fontWeight: '800', fontSize: 16 },
  pastille: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.navy, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11, borderWidth: 2, borderColor: 'rgba(200,150,44,0.7)', ...ombre },
  pastilleTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  barre: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: C.navy, borderTopWidth: 2, borderTopColor: C.brass, paddingTop: 8 },
  onglet: { flex: 1, alignItems: 'center', gap: 3 },
  ongletTxt: { color: 'rgba(255,255,255,0.72)', fontSize: 10.5, fontWeight: '700', paddingHorizontal: 2 },
  pastilleRouge: { position: 'absolute', top: -5, right: -12, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.danger, color: '#fff', fontSize: 10.5, fontWeight: '800', textAlign: 'center', lineHeight: 17, paddingHorizontal: 3, overflow: 'hidden' },
  voile: { flex: 1, backgroundColor: 'rgba(5,15,30,0.45)', justifyContent: 'flex-end' },
  panneau: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16 },
  poignee: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.lineStrong, alignSelf: 'center', marginBottom: 14 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tuile: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 16, paddingHorizontal: 6, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: '#f7f8fa' },
  tuileActive: { borderColor: C.brass, backgroundColor: '#fbf6ea' },
  tuileTxt: { fontSize: 12.5, fontWeight: '700', color: C.ink, textAlign: 'center' },
  deco: { marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e3b4ad', backgroundColor: C.dangerBg, paddingVertical: 13, alignItems: 'center' },
  decoTxt: { color: C.danger, fontWeight: '800', fontSize: 15 },
  docIcone: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fbf6ea', alignItems: 'center', justifyContent: 'center' },
  champ: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: C.ink },
  puce: { borderWidth: 1, borderColor: C.lineStrong, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  puceActive: { backgroundColor: C.navy, borderColor: C.navy },
  encadre: { backgroundColor: C.surface, borderRadius: 18, borderLeftWidth: 5, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
});
