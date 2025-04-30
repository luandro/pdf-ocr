declare module '@mistralai/mistralai' {
  export class Mistral {
    constructor(options: {
      apiKey: string;
      fetch?: (url: string, options: any) => Promise<Response>;
    });

    files: {
      upload(params: {
        file: {
          fileName: string;
          content: Buffer;
        } | Blob | FormData | any;
        purpose?: string;
      }): Promise<FileUploadResponse>;

      retrieve(params: {
        fileId: string;
      }): Promise<FileUploadResponse>;

      getSignedUrl(params: {
        fileId: string;
      }): Promise<SignedUrlResponse>;
    };

    ocr: {
      process(params: {
        model: string;
        document: {
          type: 'file_id';
          fileId: string;
        } | {
          type: 'document_url';
          documentUrl: string;
        };
      }): Promise<OCRResponse>;
    };
  }

  interface FileUploadResponse {
    id: string;
    object: string;
    bytes: number;
    created_at: number;
    filename: string;
    purpose: string;
  }

  interface OCRResponse {
    // Add the actual properties based on the API documentation
    content?: string;
    text?: string;
  }

  interface SignedUrlResponse {
    url: string;
    expires_at: number;
  }
}
