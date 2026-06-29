import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Retour haptique centralise. Sur web (ou si l'appareil ne supporte pas), tout
// est un no-op silencieux. On avale les erreurs : un haptique ne doit jamais
// faire planter une action utilisateur.
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function run(action: () => Promise<void>) {
  if (!supported) return;
  void action().catch(() => {});
}

export const haptics = {
  /** Tap leger : like, save, selection d'un element. */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Tap moyen : action plus engageante (j'y vais, reservation). */
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Changement de valeur dans une liste (choix de ville, filtre). */
  selection: () => run(() => Haptics.selectionAsync()),
  /** Confirmation d'une action reussie. */
  success: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Action annulee / retiree. */
  warning: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Echec d'une action. */
  error: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
