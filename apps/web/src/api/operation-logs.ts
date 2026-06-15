import client from "./client";

export type LogStatus = "success" | "error" | "info";

export interface OperationLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  status: LogStatus;
  message: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export const operationLogApi = {
  list: (limit = 100) =>
    client
      .get<OperationLog[]>("/operation-logs", { params: { limit } })
      .then((r) => r.data),
};
