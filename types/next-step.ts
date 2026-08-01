export type NextStepDestination = "chart" | "report" | "match" | "flow" | "qa";
export type NextStepSourceType = "report" | "article";

export interface NextStepSource {
  type: NextStepSourceType;
  id: string;
}

export interface NextStepAction {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  destination: NextStepDestination;
  reportCategory?: "general" | "palace_detail" | "ten_year";
  questions?: readonly string[];
}

export interface NextStepIntent extends NextStepSource {
  version: 1;
  actionId: string;
  destination: NextStepDestination;
  reportCategory?: "general" | "palace_detail" | "ten_year";
  question?: string;
  createdAt: number;
  expiresAt: number;
  arrivalTracked?: boolean;
}
