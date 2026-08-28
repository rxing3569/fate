import type { PremiumCheckoutDraft } from "~/types/billing";
import {
  clearPremiumCheckoutIntent,
  readPremiumCheckoutIntent,
} from "~/utils/premium-checkout";

export type PremiumFeature = Extract<
  PremiumCheckoutDraft,
  { source: "premium_feature" }
>["feature"];

export function usePremiumFeatureGate() {
  const auth = useAuthStore();
  const route = useRoute();
  const showPremiumCheckout = ref(false);
  const premiumCheckoutDraft = ref<PremiumCheckoutDraft | null>(null);
  const resumeFeature = ref<PremiumFeature | null>(null);

  function openCheckout(draft: PremiumCheckoutDraft) {
    premiumCheckoutDraft.value = draft;
    showPremiumCheckout.value = true;
  }

  function requestFeature(
    feature: PremiumFeature,
    returnTo: "/report" | "/flow" | "/annual-flow" | "/match" | "/qa",
  ) {
    openCheckout({ source: "premium_feature", feature, returnTo });
  }

  function restoreFeature(allowed: PremiumFeature[]) {
    if (!auth.premium) return null;
    const intent = readPremiumCheckoutIntent({
      userUuid: String(auth.profile?.uuid || ""),
      source: "premium_feature",
    });
    if (
      !intent ||
      intent.source !== "premium_feature" ||
      intent.returnTo !== route.path ||
      !allowed.includes(intent.feature)
    )
      return null;
    resumeFeature.value = intent.feature;
    clearPremiumCheckoutIntent();
    return intent.feature;
  }

  function closeCheckout() {
    showPremiumCheckout.value = false;
  }

  function closeResume() {
    resumeFeature.value = null;
  }

  return {
    showPremiumCheckout,
    premiumCheckoutDraft,
    resumeFeature,
    openCheckout,
    requestFeature,
    restoreFeature,
    closeCheckout,
    closeResume,
  };
}
