import { useState, useCallback, useEffect } from 'react';
import type { UploadedFile, UploadProgress } from '@/types/file';

const STORAGE_KEY = 'dropzone_files';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateUrl(id: string): string {
  return `https://dropz.one/f/${id}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function useFileStore() {
  const [files, setFiles] = useState<UploadedFile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [progresses, setProgresses] = useState<UploadProgress[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }, [files]);

  const addFile = useCallback((file: File): Promise<UploadedFile> => {
    return new Promise((resolve, reject) => {
      const id = generateId();
      
      setProgresses(prev => [...prev, { fileId: id, progress: 0, status: 'uploading' }]);

      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgresses(prev =>
            prev.map(p => p.fileId === id ? { ...p, progress: percent } : p)
          );
        }
      };

      reader.onload = () => {
        const dataUrl = reader.result as string;
        const uploadedFile: UploadedFile = {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: generateUrl(id),
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };

        setTimeout(() => {
          setFiles(prev => [uploadedFile, ...prev]);
          setProgresses(prev =>
            prev.map(p => p.fileId === id ? { ...p, progress: 100, status: 'completed' } : p)
          );
          resolve(uploadedFile);
        }, 500);
      };

      reader.onerror = () => {
        setProgresses(prev =>
          prev.map(p => p.fileId === id ? { ...p, status: 'error' } : p)
        );
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setProgresses(prev => prev.filter(p => p.fileId !== id));
  }, []);

  const getProgress = useCallback((id: string): UploadProgress | undefined => {
    return progresses.find(p => p.fileId === id);
  }, [progresses]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setProgresses([]);
  }, []);

  return {
    files,
    addFile,
    removeFile,
    getProgress,
    clearAll,
    formatFileSize,
  };
}
