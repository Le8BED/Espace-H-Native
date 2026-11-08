import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Accueil from '@/equipe/Accueil';
import Agenda from '@/equipe/Agenda';
import { Comptes, Contrats, Courriers, Demandes, DocumentsAdmin } from '@/equipe/Admin2';
import Chat from '@/equipe/Chat';
import { DonneesAgent, Salle } from '@/equipe/Commerciaux';
import Compta from '@/equipe/Compta';
import Crm from '@/equipe/Crm';
import Emails from '@/equipe/Emails';
import EtatsDesLieux from '@/equipe/EtatsDesLieux';
import Gestion from '@/equipe/Gestion';
import Loyers from '@/equipe/Loyers';
import Publication from '@/equipe/Publication';
import { DomiciliationAdmin, MakomAdmin, VefaAdmin } from '@/equipe/Reservations';
import Reversements from '@/equipe/Reversements';
import Travaux from '@/equipe/Travaux';
import { extranetGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BarreEspace, Documents, type Onglet } from './commun';

// Espace de l'équipe, 100 % natif, selon le profil :
//  - admin : Accueil · Loyers · Gestion · Chat + Menu (emails, CRM,
//    publication, travaux, compta, reversements, MAKOMSPACE, domiciliation,
//    VEFA, agenda, comptes, documents, demandes, contrats, courriers) ;
//  - commercial : Publication · Gestion · Chat · Mandats + Menu ;
//  - agent commercial : Publication · Mandats · Acquéreurs · Planning + Menu ;
//  - salle : Réservations.

function ecranAdmin(k: string, aller: (k: string) => void) {
  switch (k) {
    case 'loyers':
      return <Loyers />;
    case 'gestion':
      return <Gestion />;
    case 'chat':
      return <Chat />;
    case 'emails':
      return <Emails />;
    case 'crm':
      return <Crm />;
    case 'publication':
      return <Publication />;
    case 'travaux':
      return <Travaux />;
    case 'compta':
      return <Compta />;
    case 'reversements':
      return <Reversements />;
    case 'makomspace':
      return <MakomAdmin />;
    case 'domiciliation':
      return <DomiciliationAdmin />;
    case 'vefa':
      return <VefaAdmin />;
    case 'agenda':
      return <Agenda />;
    case 'comptes':
      return <Comptes />;
    case 'documents':
      return <DocumentsAdmin />;
    case 'demandes':
      return <Demandes />;
    case 'contrats':
      return <Contrats />;
    case 'courriers':
      return <Courriers />;
    case 'edl':
      return <EtatsDesLieux />;
    default:
      return <Accueil aller={aller} />;
  }
}

export default function Equipe() {
  const { user } = useAuth();
  const role = String(user?.role);
  const [onglet, setOnglet] = useState(role === 'admin' ? 'accueil' : role === 'salle' ? 'salle' : role === 'agent_commercial' ? 'publication' : 'publication');
  const [chatNonLus, setChatNonLus] = useState(0);

  useEffect(() => {
    if (role !== 'admin' && role !== 'commercial') return;
    const lire = () =>
      extranetGet<{ summary: { conversations: number } | null }>('/api/chat?summary=1')
        .then((d) => setChatNonLus(d.summary?.conversations || 0))
        .catch(() => {});
    lire();
    const t = setInterval(lire, 30000);
    return () => clearInterval(t);
  }, [role]);

  if (role === 'admin') {
    const onglets: Onglet[] = [
      { key: 'accueil', label: 'Accueil', icone: 'grid-outline' },
      { key: 'loyers', label: 'Loyers', icone: 'cash-outline' },
      { key: 'gestion', label: 'Gestion', icone: 'key-outline' },
      { key: 'chat', label: 'Chat', icone: 'chatbubbles-outline', badge: chatNonLus },
    ];
    const menu: Onglet[] = [
      { key: 'edl', label: 'États des lieux', icone: 'clipboard-outline' },
      { key: 'emails', label: 'Emails', icone: 'mail-outline' },
      { key: 'crm', label: 'CRM', icone: 'people-outline' },
      { key: 'publication', label: 'Publication', icone: 'megaphone-outline' },
      { key: 'travaux', label: 'Travaux', icone: 'construct-outline' },
      { key: 'compta', label: 'Comptabilité', icone: 'calculator-outline' },
      { key: 'reversements', label: 'Reversements', icone: 'wallet-outline' },
      { key: 'makomspace', label: 'MAKOMSPACE', icone: 'easel-outline' },
      { key: 'domiciliation', label: 'Domiciliation', icone: 'mail-open-outline' },
      { key: 'vefa', label: 'VEFA', icone: 'business-outline' },
      { key: 'agenda', label: 'Agenda', icone: 'calendar-outline' },
      { key: 'comptes', label: 'Comptes', icone: 'person-circle-outline' },
      { key: 'documents', label: 'Documents', icone: 'folder-outline' },
      { key: 'demandes', label: 'Demandes', icone: 'git-pull-request-outline' },
      { key: 'contrats', label: 'Contrats', icone: 'document-text-outline' },
      { key: 'courriers', label: 'À poster', icone: 'paper-plane-outline' },
    ];
    return (
      <View style={{ flex: 1 }}>
        {ecranAdmin(onglet, setOnglet)}
        <BarreEspace onglets={onglets} actif={onglet} onChoisir={setOnglet} menu={menu} />
      </View>
    );
  }

  if (role === 'salle')
    return (
      <View style={{ flex: 1 }}>
        {onglet === 'documents' ? <Documents /> : <Salle />}
        <BarreEspace
          onglets={[
            { key: 'salle', label: 'Réservations', icone: 'calendar-outline' },
            { key: 'documents', label: 'Documents', icone: 'folder-outline' },
          ]}
          actif={onglet}
          onChoisir={setOnglet}
          menu={[]}
        />
      </View>
    );

  // Commercial et agent commercial
  const commercial = role === 'commercial';
  const onglets: Onglet[] = commercial
    ? [
        { key: 'publication', label: 'Publication', icone: 'megaphone-outline' },
        { key: 'gestion', label: 'Gestion', icone: 'key-outline' },
        { key: 'chat', label: 'Chat', icone: 'chatbubbles-outline', badge: chatNonLus },
        { key: 'biens', label: 'Mandats', icone: 'home-outline' },
      ]
    : [
        { key: 'publication', label: 'Publication', icone: 'megaphone-outline' },
        { key: 'biens', label: 'Mandats', icone: 'home-outline' },
        { key: 'acquereurs', label: 'Acquéreurs', icone: 'people-outline' },
        { key: 'planning', label: 'Planning', icone: 'calendar-outline' },
      ];
  const menu: Onglet[] = [
    ...(commercial
      ? [
          { key: 'acquereurs', label: 'Acquéreurs', icone: 'people-outline' as const },
          { key: 'planning', label: 'Planning', icone: 'calendar-outline' as const },
        ]
      : []),
    ...(commercial ? [{ key: 'edl', label: 'États des lieux', icone: 'clipboard-outline' as const }] : []),
    { key: 'transactions', label: 'Transactions', icone: 'swap-horizontal-outline' },
    { key: 'demandes', label: 'Mes demandes', icone: 'git-pull-request-outline' },
    { key: 'contrats', label: 'Contrats', icone: 'document-text-outline' },
    { key: 'documents', label: 'Documents', icone: 'folder-outline' },
  ];
  let ecran;
  if (onglet === 'gestion') ecran = <Gestion />;
  else if (onglet === 'chat') ecran = <Chat />;
  else if (onglet === 'biens' || onglet === 'acquereurs' || onglet === 'planning' || onglet === 'transactions') ecran = <DonneesAgent key={onglet} entite={onglet} />;
  else if (onglet === 'demandes') ecran = <Demandes />;
  else if (onglet === 'contrats') ecran = <Contrats />;
  else if (onglet === 'documents') ecran = <Documents />;
  else if (onglet === 'edl') ecran = <EtatsDesLieux />;
  else ecran = <Publication />;
  return (
    <View style={{ flex: 1 }}>
      {ecran}
      <BarreEspace onglets={onglets} actif={onglet} onChoisir={setOnglet} menu={menu} />
    </View>
  );
}
