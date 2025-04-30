declare module '@mistralai/mistralai' {
  export class Mistral {
    constructor(options: { apiKey: string });

    ocr: {
      process(params: {
        model: string;
        document: {
          type: 'document_url';
          documentUrl: string;
        };
      }): Promise<OCRResponse>;
    };
  }

  interface OCRResponse {
    // Add the actual properties based on the API documentation
    content: string;
  }
}
