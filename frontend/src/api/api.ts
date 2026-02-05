/*
 * @Author: xel
 * @Date: 2026-02-05 11:23:04
 * @LastEditors: xel
 * @LastEditTime: 2026-02-05 11:25:07
 * @FilePath: \frontend\src\api\api.ts
 * @Description: 
 */
/**
 * Home 页面 API 接口
 */
import http from "@/utils/http";

// ==================== 类型定义 ====================

export interface PlanItem {
  id: number;
  title: string;
  completed: boolean;
  color: string;
  date: string; // YYYY-MM-DD 格式
}

export interface DailyQuote {
  text: string;
  author: string;
}

export interface CheckInInfo {
  days: number;
  lastCheckIn: string;
  isCheckedToday: boolean;
}

export interface DailyThought {
  id?: number;
  content: string;
  date: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: number;
  type: "image" | "document" | "other";
  url: string;
  name: string;
}

export interface AiSuggestion {
  id: number;
  title: string;
}

export interface AiPlanRequest {
  goal: string;
}

export interface AiPlanResponse {
  suggestions: AiSuggestion[];
}

// ==================== 打卡相关 ====================

/**
 * 获取打卡信息
 */
export const getCheckInInfo = () => {
  return http.get<CheckInInfo>("/home/checkin/info");
};

/**
 * 执行打卡
 */
export const doCheckIn = () => {
  return http.post("/home/checkin");
};

// ==================== 每日一句 ====================

/**
 * 获取每日一句
 */
export const getDailyQuote = () => {
  return http.get<DailyQuote>("/home/quote");
};

// ==================== 计划列表 ====================

/**
 * 获取指定日期的计划列表
 * @param date 日期 YYYY-MM-DD 格式
 */
export const getPlansByDate = (date: string) => {
  return http.get<PlanItem[]>(`/home/plans?date=${date}`);
};

/**
 * 获取某月所有有计划的日期
 * @param year 年份
 * @param month 月份 1-12
 */
export const getPlansCalendar = (year: number, month: number) => {
  return http.get<Record<string, PlanItem[]>>(
    `/home/plans/calendar?year=${year}&month=${month}`,
  );
};

/**
 * 创建计划
 */
export const createPlan = (plan: Omit<PlanItem, "id">) => {
  return http.post<PlanItem>("/home/plans", plan);
};

/**
 * 更新计划
 */
export const updatePlan = (id: number, plan: Partial<PlanItem>) => {
  return http.put<PlanItem>(`/home/plans/${id}`, plan);
};

/**
 * 删除计划
 */
export const deletePlan = (id: number) => {
  return http.delete(`/home/plans/${id}`);
};

/**
 * 切换计划完成状态
 */
export const togglePlanStatus = (id: number) => {
  return http.patch<PlanItem>(`/home/plans/${id}/toggle`);
};

// ==================== 每日感想 ====================

/**
 * 获取指定日期的每日感想
 */
export const getDailyThought = (date: string) => {
  return http.get<DailyThought>(`/home/thoughts?date=${date}`);
};

/**
 * 保存每日感想
 */
export const saveDailyThought = (thought: DailyThought) => {
  return http.post<DailyThought>("/home/thoughts", thought);
};

/**
 * 上传附件
 */
export const uploadAttachment = (file: FormData) => {
  return http.post<Attachment>("/home/attachments", file, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// ==================== AI 计划助手 ====================

/**
 * AI 生成计划建议
 */
export const generateAiPlan = (data: AiPlanRequest) => {
  return http.post<AiPlanResponse>("/home/ai/generate-plan", data);
};

/**
 * 采纳 AI 建议并添加到计划
 */
export const acceptAiSuggestion = (suggestion: AiSuggestion, date: string) => {
  return http.post<PlanItem>("/home/ai/accept", { ...suggestion, date });
};
