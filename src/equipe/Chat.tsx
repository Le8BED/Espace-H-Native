import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';
import { Champ, LigneAction } from '@/components/form';
import { Badge, Bouton, Carte, Chargement, Vide, s as ui } from '@/components/ui';
import { useDonnees } from '@/espace/commun';
import { extranetPost } from '@/lib/api';
import { dateFr } from '@/lib/format';
import { C } from '@/lib/theme';
import { Onglets, Section, useAction } from './outils';

// Chat du site : conversations des visiteurs, réponse (et copie par email).

type Conv = { id: number; name: string; email: string; phone: string; status: string; sujet: string | null; service: string; unread: number; lastMessageAt: string; lastBody: string; lastSender: string };
type Detail = { id: number; name: string; email: string; phone: string; pageUrl: string; status: string; sujet: string | null; messages: { id: number; sender: string; bot: boolean; authorName: string; body: string; createdAt: string }[] };

function Conversation({ id, retour }: { id: number; retour: () => void }) {
  const { data, chargement, charger } = useDonnees<{ conversation: Detail }>(`/api/chat?id=${id}`);
  const [texte, setTexte] = useState('');
  const [email, setEmail] = useState(true);
  const { busy, lancer } = useAction();
  const c = data?.conversation;
  return (
    <View>
      <Pressable onPress={retour} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="chevron-back" size={22} color={C.navy} />
        <Text style={{ color: C.navy, fontWeight: '700' }}>Conversations</Text>
      </Pressable>
      {chargement && !c ? <Chargement /> : null}
      {c ? (
        <>
          <Text style={ui.titre}>{c.name || 'Visiteur'}</Text>
          <Text style={[ui.petit, { marginBottom: 10 }]}>
            {[c.email, c.phone, c.sujet].filter(Boolean).join(' · ')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {c.phone ? <Bouton titre="Appeler" variante="contour" onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`)} style={{ flex: 1 }} /> : null}
            <Bouton
              titre={c.status === 'fermee' ? 'Rouvrir' : 'Clôturer'}
              variante="contour"
              onPress={() => lancer(() => extranetPost('/api/chat', { action: 'status', id: c.id, status: c.status === 'fermee' ? 'ouverte' : 'fermee' }).then(charger))}
              style={{ flex: 1 }}
            />
          </View>
          {c.messages.map((m) => (
            <View
              key={m.id}
              style={{
                alignSelf: m.sender === 'agence' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                backgroundColor: m.sender === 'agence' ? C.navy : C.surface,
                borderRadius: 16,
                padding: 11,
                marginBottom: 8,
                borderWidth: m.sender === 'agence' ? 0 : 1,
                borderColor: C.line,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: m.sender === 'agence' ? C.brassLight : C.brass }}>
                {m.sender === 'agence' ? (m.bot ? 'Assistant' : m.authorName || 'Agence') : c.name || 'Visiteur'} · {dateFr(m.createdAt)}
              </Text>
              <Text style={{ color: m.sender === 'agence' ? '#fff' : C.ink, fontSize: 15, marginTop: 2 }}>{m.body}</Text>
            </View>
          ))}
          <Carte style={{ marginTop: 8 }}>
            <Champ label="Votre réponse" valeur={texte} onChange={(t) => setTexte(t.slice(0, 2000))} multiligne />
            {c.email ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Switch value={email} onValueChange={setEmail} />
                <Text style={ui.petit}>Envoyer aussi par email à {c.email}</Text>
              </View>
            ) : null}
            <Bouton
              titre={busy ? 'Envoi…' : 'Répondre'}
              desactive={busy || !texte.trim()}
              onPress={() =>
                lancer(async () => {
                  await extranetPost('/api/chat', { action: 'reply', id: c.id, message: texte.trim(), sendEmail: email });
                  setTexte('');
                  charger();
                })
              }
            />
          </Carte>
        </>
      ) : null}
    </View>
  );
}

export default function Chat() {
  const [statut, setStatut] = useState<'ouverte' | 'fermee' | 'toutes'>('ouverte');
  const { data, erreur, chargement, charger } = useDonnees<{ conversations: Conv[]; counts: { ouverte: number; fermee: number }; migrationManquante?: boolean }>(`/api/chat?status=${statut}`);
  const [id, setId] = useState<number | null>(null);
  if (id)
    return (
      <Section titre="Chat du site" onRefresh={charger}>
        <Conversation
          id={id}
          retour={() => {
            setId(null);
            charger();
          }}
        />
      </Section>
    );
  const convs = data?.conversations || [];
  return (
    <Section titre="Chat du site" chargement={chargement && !data} erreur={erreur} onRefresh={charger}>
      <Onglets
        options={[
          ['ouverte', 'Ouvertes', data?.counts?.ouverte],
          ['fermee', 'Clôturées'],
          ['toutes', 'Toutes'],
        ]}
        valeur={statut}
        onChange={setStatut}
      />
      {data && !convs.length ? <Vide texte="Aucune conversation." /> : null}
      {convs.map((c) => (
        <LigneAction
          key={c.id}
          icone={c.unread ? 'chatbubble' : 'chatbubble-outline'}
          titre={`${c.name || 'Visiteur'}${c.sujet ? ` · ${c.sujet}` : ''}`}
          sous={`${c.lastSender === 'agence' ? 'Vous : ' : ''}${c.lastBody} · ${dateFr(c.lastMessageAt)}`}
          onPress={() => setId(c.id)}
          droite={c.unread ? <Badge texte={String(c.unread)} couleur="#fff" fond={C.danger} /> : undefined}
        />
      ))}
    </Section>
  );
}
