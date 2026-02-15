export interface QuotaInfo {
    remainingFraction: number;
    resetTime?: string;
}

export interface ClientModelConfig {
    label: string;
    quotaInfo?: QuotaInfo;
}

export interface ModelQuota {
    name: string; // model name
    remaining: number; // 1-100
    resetTime: string; // 1 hr 30 mint // ISO 8601
}
