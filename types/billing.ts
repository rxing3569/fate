import type { BirthInfo } from "~/types/ziwei";

export interface WebPromotion {
  code: string;
  label: string;
  discount_percent: number;
  price_lock: "until_cancelled";
}

export interface WebProduct {
  id: string;
  name: string;
  description: string;
  kind: "points" | "subscription";
  points?: number;
  price: number;
  original_price?: number;
  currency: string;
  period?: string;
  promotion?: WebPromotion;
}

export interface WebCheckoutResult {
  order: { uuid: string; merchant_order_no: string; status: string };
  action_url: string;
  fields: Record<string, string>;
}

export type PremiumCheckoutDraft =
  | {
      source: "qa";
      question: string;
    }
  | {
      source: "match";
      matchType: string;
      birthInfo: BirthInfo;
    }
  | {
      source: "premium_feature";
      feature:
        | "report_pdf"
        | "flow_pdf"
        | "match_pdf"
        | "match_history";
      returnTo: "/report" | "/flow" | "/match";
    };

export type PremiumCheckoutIntent = PremiumCheckoutDraft & {
  version: 1;
  userUuid: string;
  merchantOrderNo: string;
  createdAt: number;
  expiresAt: number;
};
