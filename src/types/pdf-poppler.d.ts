declare module 'pdf-poppler' {
  export interface ConvertOptions {
    format?: 'png' | 'jpeg' | 'tiff' | 'pdf';
    out_dir?: string;
    out_prefix?: string;
    page?: number | number[];
    density?: number;
    scale?: number;
    grayscale?: boolean;
    cropbox?: boolean;
    transparent?: boolean;
  }

  export function convert(pdfPath: string, options?: ConvertOptions): Promise<void>;
}
