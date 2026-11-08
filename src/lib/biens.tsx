import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { siteGet } from './api';

// Catalogue des biens publiés sur le site (et lots du programme neuf),
// chargé une fois puis partagé entre les écrans.

export type Bien = {
  ref: string;
  type: string;
  title: string;
  city: string;
  quartier: string;
  postal_code: string;
  price: number;
  surface: number;
  pieces: number;
  chambres: number;
  dpe: string;
  status: string;
  transaction_type: string; // 'acquisition' | 'location'
  description: string;
  etat: string;
  construction: string;
  exposition: string;
  floor_position: string;
  elevator: boolean;
  exterior: string[];
  features: string[];
  exclusif: boolean;
  photos: string[];
  url: string;
};

export type Lot = { id: string; lot: string; type: string; etage: string; surface: number; expo: string; prix: number; rendement: string; statut: string };

type Etat = { biens: Bien[]; lots: Lot[]; chargement: boolean; erreur: string; recharger: () => Promise<void> };
const Ctx = createContext<Etat | null>(null);

export function BiensProvider({ children }: { children: ReactNode }) {
  const [biens, setBiens] = useState<Bien[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const d = await siteGet<{ biens: Bien[]; lots: Lot[] }>('/api/app/biens');
      setBiens(d.biens || []);
      setLots(d.lots || []);
    } catch (e) {
      setErreur((e as Error).message || 'Connexion impossible');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger]);

  return <Ctx.Provider value={{ biens, lots, chargement, erreur, recharger }}>{children}</Ctx.Provider>;
}

export function useBiens() {
  const v = useContext(Ctx);
  if (!v) throw new Error('BiensProvider manquant');
  return v;
}
