export interface AchievementMetadata {
  job_id: string;
  date: string;
  reviewed: boolean;
  has_evidence: boolean;
  text_hash: string;
}

export interface BulletMetadata {
  job_id: string;
  resume_file: string;
  resume_date: string;
  target_company: string;
  target_role: string;
  text_hash: string;
  feedback: string | null;
  nearest_achievement_id: string | null;
  achievement_distance: number | null;
}

export interface QueryResult {
  text: string;
  source: "achievement" | "ai_generated";
  job_id: string;
  similarity: number;
  achievement_distance: number | null;
  grounded: boolean;
  reuse_count: number;
  last_used: string | null;
  feedback: string | null;
}

export type FeedbackSignal = "great" | "exaggerated" | "needs_evidence" | "weak";

export const GROUNDEDNESS_THRESHOLD = 0.3;
export const CLUSTER_THRESHOLD = 0.92;

export const COLLECTIONS = {
  ACHIEVEMENTS: "achievements",
  BULLETS: "bullets",
} as const;
