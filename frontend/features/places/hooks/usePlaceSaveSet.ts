import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { clearAuthState, isUnauthorizedError, storage } from '@/services/api';
import { togglePlaceSave } from '@/services/places/place-save';
import { haptics } from '@/services/shared/haptics';
import { useI18n } from '@/shared/hooks/use-i18n';

type UsePlaceSaveSetOptions = {
  /** Appele apres un retrait confirme (ex: enlever la carte d'une liste "sauvegardes"). */
  onUnsave?: (placeId: string) => void;
};

// Source unique de verite pour le bouton "sauvegarder un lieu", partagee par
// tous les ecrans (accueil, lieux, profil, discover, categorie, carte).
// - bascule optimiste (UI immediate) + retour haptique
// - reconciliation avec la reponse serveur, rollback + haptique d'erreur si echec
// - gestion du 401 (deconnexion propre)
export function usePlaceSaveSet(options?: UsePlaceSaveSetOptions) {
  const router = useRouter();
  const { t } = useI18n();
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [savingPlaceIds, setSavingPlaceIds] = useState<Set<string>>(new Set());

  // Refs pour lire l'etat courant sans recreer toggleSave a chaque changement.
  const savedRef = useRef(savedPlaceIds);
  savedRef.current = savedPlaceIds;
  const savingRef = useRef(savingPlaceIds);
  savingRef.current = savingPlaceIds;
  const onUnsaveRef = useRef(options?.onUnsave);
  onUnsaveRef.current = options?.onUnsave;

  const toggleSave = useCallback(
    async (placeId: string) => {
      const token = await storage.getItem('userToken');

      if (!token) {
        Alert.alert(
          t('placeDetailLoginRequiredTitle'),
          t('placeDetailLoginRequiredMessage'),
        );
        return;
      }

      if (savingRef.current.has(placeId)) {
        return;
      }

      const wasSaved = savedRef.current.has(placeId);

      haptics.light();
      setSavedPlaceIds((current) => {
        const next = new Set(current);
        if (wasSaved) {
          next.delete(placeId);
        } else {
          next.add(placeId);
        }
        return next;
      });
      setSavingPlaceIds((current) => {
        const next = new Set(current);
        next.add(placeId);
        return next;
      });

      try {
        const { saved } = await togglePlaceSave(placeId);
        setSavedPlaceIds((current) => {
          const next = new Set(current);
          if (saved) {
            next.add(placeId);
          } else {
            next.delete(placeId);
          }
          return next;
        });
        if (!saved) {
          onUnsaveRef.current?.(placeId);
        }
      } catch (error) {
        // Rollback de l'optimistic.
        setSavedPlaceIds((current) => {
          const next = new Set(current);
          if (wasSaved) {
            next.add(placeId);
          } else {
            next.delete(placeId);
          }
          return next;
        });
        haptics.error();

        if (isUnauthorizedError(error)) {
          await clearAuthState();
          router.replace('/');
          return;
        }

        Alert.alert(t('commonErrorTitle'), t('placeDetailSaveUpdateFailed'));
      } finally {
        setSavingPlaceIds((current) => {
          const next = new Set(current);
          next.delete(placeId);
          return next;
        });
      }
    },
    [router, t],
  );

  return { savedPlaceIds, setSavedPlaceIds, savingPlaceIds, toggleSave };
}
