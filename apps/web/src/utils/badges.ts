// 节点类型徽章配色（按设计稿统一）
export const NODE_TYPE_COLOR: Record<string, string> = {
  vmess: "#722ed1", // 紫
  trojan: "#0fad9b", // 青
  ss: "#d48806", // 琥珀
  vless: "#1668dc", // 蓝
  ssr: "#eb2f96", // 粉
  http: "#86909c", // 灰
};

export function nodeTypeColor(type: string): string {
  return NODE_TYPE_COLOR[type?.toLowerCase()] ?? "#86909c";
}

// 订阅抓取状态点
export interface StatusMeta {
  label: string;
  color: string;
}

export const FETCH_STATUS: Record<string, StatusMeta> = {
  success: { label: "成功", color: "#10b981" },
  error: { label: "失败", color: "#ef4444" },
  fetching: { label: "抓取中", color: "#f59e0b" },
  pending: { label: "未抓取", color: "#9ca3af" }, // 含 null
};

export function fetchStatusMeta(status: string | null | undefined): StatusMeta {
  return FETCH_STATUS[status ?? "pending"] ?? FETCH_STATUS.pending;
}
