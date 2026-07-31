import { useCallback, useEffect, useState } from 'react';
import type { FavoriteTransitStop, TransitStop } from '../types';
import {
  loadFavoriteStops,
  addFavoriteStop as persistAdd,
  removeFavoriteStop as persistRemove,
  renameFavoriteStop as persistRename,
  isFavoriteStop,
} from '../services/transit/favorites';

export interface UseFavoriteStopsResult {
  favorites: FavoriteTransitStop[];
  isFavorite: (stopId: string) => boolean;
  addStop: (stop: TransitStop, customName?: string) => void;
  removeStop: (stopId: string) => void;
  renameStop: (stopId: string, customName: string) => void;
}

/** Favorite transit stops persisted to localStorage (device-local by design). */
export function useFavoriteStops(): UseFavoriteStopsResult {
  const [favorites, setFavorites] = useState<FavoriteTransitStop[]>([]);

  useEffect(() => {
    setFavorites(loadFavoriteStops());
  }, []);

  const addStop = useCallback((stop: TransitStop, customName?: string) => {
    setFavorites(persistAdd(stop, customName));
  }, []);

  const removeStop = useCallback((stopId: string) => {
    setFavorites(persistRemove(stopId));
  }, []);

  const renameStop = useCallback((stopId: string, customName: string) => {
    setFavorites(persistRename(stopId, customName));
  }, []);

  const isFavorite = useCallback((stopId: string) => isFavoriteStop(favorites, stopId), [favorites]);

  return { favorites, isFavorite, addStop, removeStop, renameStop };
}
