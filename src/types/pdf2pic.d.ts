declare module 'pdf2pic' {
  export interface Pdf2PicOptions {
    density?: number;
    savePath?: string;
    format?: string;
    width?: number;
    height?: number;
    quality?: number;
  }

  export interface ConversionResult {
    path: string;
    name: string;
    size: number;
    page: number;
  }

  export type Converter = (pageNumber: number) => Promise<ConversionResult>;

  export function fromBuffer(buffer: Buffer, options?: Pdf2PicOptions): Converter;
  export function fromPath(path: string, options?: Pdf2PicOptions): Converter;
}
