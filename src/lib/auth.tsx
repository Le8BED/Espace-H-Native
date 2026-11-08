import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { chargerJeton, enregistrerJeton, extranetGet, extranetPost } from './api';

// Connexion à l'espace client (extranet). L'utilisateur reste connecté
// 30 jours (jeton gardé dans le coffre sécurisé du téléphone).

export type Role = 'admin' | 'locataire' | 'proprietaire' | 'domiciliation' | 'salle' | 'agent_commercial' | 'commercial' | string;
export type Utilisateur = { id: string; name: string; email?: string; login?: string | null; role: Role; profileId?: string };

type Etat = {
  pret: boolean;
  user: Utilisateur | null;
  profile: any;
  connecter: (identifiant: string, motDePasse: string) => Promise<Utilisateur>;
  deconnecter: () => Promise<void>;
  rafraichir: () => Promise<void>;
};

const Ctx = createContext<Etat | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const rafraichir = useCallback(async () => {
    try {
      const d = await extranetGet<{ user: Utilisateur | null; profile: any }>('/api/auth/me');
      setUser(d.user || null);
      setProfile(d.profile || null);
      if (!d.user) await enregistrerJeton(null);
    } catch {
      /* hors connexion : on garde l'état actuel */
    }
  }, []);

  useEffect(() => {
    (async () => {
      const t = await chargerJeton();
      if (t) await rafraichir();
      setPret(true);
    })();
  }, [rafraichir]);

  const connecter = useCallback(async (identifiant: string, motDePasse: string) => {
    const d = await extranetPost<{ token: string; user: Utilisateur; profile: any }>('/api/app/login', { identifiant, password: motDePasse });
    await enregistrerJeton(d.token);
    setUser(d.user);
    setProfile(d.profile);
    return d.user;
  }, []);

  const deconnecter = useCallback(async () => {
    await enregistrerJeton(null);
    setUser(null);
    setProfile(null);
  }, []);

  const valeur = useMemo(() => ({ pret, user, profile, connecter, deconnecter, rafraichir }), [pret, user, profile, connecter, deconnecter, rafraichir]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider manquant');
  return v;
}
