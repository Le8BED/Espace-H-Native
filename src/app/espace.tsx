import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { Chargement } from '@/components/ui';
import Domiciliation from '@/espace/Domiciliation';
import Equipe from '@/espace/Equipe';
import Locataire from '@/espace/Locataire';
import Proprietaire from '@/espace/Proprietaire';
import { useAuth } from '@/lib/auth';
import { C } from '@/lib/theme';

// Espace client natif : l'écran affiché dépend du profil connecté.
export default function Espace() {
  const { pret, user } = useAuth();
  if (!pret)
    return (
      <View style={{ flex: 1, backgroundColor: C.ground, justifyContent: 'center' }}>
        <Chargement />
      </View>
    );
  if (!user) return <Redirect href="/connexion" />;
  if (user.role === 'locataire') return <Locataire />;
  if (user.role === 'proprietaire') return <Proprietaire />;
  if (user.role === 'domiciliation') return <Domiciliation />;
  return <Equipe />;
}
