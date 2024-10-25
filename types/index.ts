// types/index.ts
export interface ImageData {
    image: string;  // base64 encoded image string
    dict_of_vars: Record<string, number | string | boolean | object>; // Specify allowed types
  }
  
  export interface ProcessedResult {
    expr: string;
    result: number | string | boolean | object; // Replace 'any' with specific types
    assign: boolean;
  }
  
  export interface ApiResponse {
    message: string;
    data: ProcessedResult[];
    status: string;
  }
  