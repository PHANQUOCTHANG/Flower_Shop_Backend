
export class ApiResponse<T> {
  status: "success" | "error";
  message?: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    results?: number;
  };

  constructor(data?: T, meta?: any, message?: string) {
    this.status = "success";
    this.data = data;
    this.meta = meta;
    this.message = message;
  }

  static success<T>(data: T, message?: string) {
    return new ApiResponse(data, undefined, message);
  }

  static paginate<T>(result: any) {
    const { data, ...meta } = result;
    return new ApiResponse(data, { ...meta, results: data.length });
  }
}