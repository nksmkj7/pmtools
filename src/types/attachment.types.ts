export interface UploadAttachmentInput {
  filename: string;
  mimeType: string;
  /** Raw file bytes, base64-encoded. */
  contentBase64: string;
}

export interface Attachment {
  id?: string;
  url: string;
}
