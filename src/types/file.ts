export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}
