export interface PaginatedDocumentsResponse {
  data: {
    id: string;
    code: string;
    entityType: string;
    createdAt: Date;
  }[];

  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}