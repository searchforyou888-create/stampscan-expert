export type CollectibleCategory = 'stamp' | 'coin' | 'banknote' | 'card' | 'other';
export type ExpertVerificationStatus = 'none' | 'pending' | 'verified';
export type GuidedConditionGrade = 'auto' | 'mint' | 'very_good' | 'worn';
export type GuidedConditionIssue = 'folded' | 'stained' | 'damaged_edges';

export interface Database {
  public: {
    Tables: {
      collection_items: {
        Row: {
          id: string;
          user_id: string | null;
          type: CollectibleCategory;
          name: string;
          description: string;
          estimated_value_min: number;
          estimated_value_max: number;
          estimated_value_currency: string;
          confidence_score: number;
          historical_info: string;
          origin_country: string;
          origin_year: string;
          image_url: string;
          ai_analysis: Record<string, unknown>;
          notes: string | null;
          guided_condition_grade: GuidedConditionGrade;
          guided_condition_issues: GuidedConditionIssue[];
          expert_verification_status: ExpertVerificationStatus;
          expert_verification_requested_at: string | null;
          expert_verification_completed_at: string | null;
          expert_verification_report: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['collection_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          user_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['collection_items']['Insert']>;
      };
      catalogue_items: {
        Row: {
          id: string;
          category: CollectibleCategory;
          name: string;
          description: string;
          country: string;
          period_start: number | null;
          period_end: number | null;
          estimated_value_min: number;
          estimated_value_max: number;
          currency: string;
          rarity: string;
          condition_reference: string;
          catalogue_ref: string | null;
          image_url: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['catalogue_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['catalogue_items']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      collectible_category: CollectibleCategory;
    };
  };
}

export type CollectionItemRow = Database['public']['Tables']['collection_items']['Row'];
export type CatalogueItemRow = Database['public']['Tables']['catalogue_items']['Row'];
