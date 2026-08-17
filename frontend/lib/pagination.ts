export interface PaginatedMeta {
  current_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginatedMeta;
}

export function metaOf<T>(response: PaginatedResponse<T>): PaginatedMeta {
  return response.meta ?? { current_page: 1, per_page: response.data.length, total: response.data.length };
}
