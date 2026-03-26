import api from './api';

export type ReportTargetType =
  | 'POST'
  | 'COMMENT'
  | 'EVENT'
  | 'PLACE'
  | 'REVIEW'
  | 'USER';

export const createReport = async (
  targetId: string,
  targetType: ReportTargetType,
  reason: string,
) => {
  return api.post('/reports', {
    targetId,
    targetType,
    reason,
  });
};
