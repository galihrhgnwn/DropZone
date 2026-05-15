import { useState, useCallback } from 'react';

export interface UploadJob {
  id: string;
  file: File;
  duration: string;
  progress: number;
  status: 'pending' | 'uploading' | 'finalizing' | 'completed' | 'error';
  error?: string;
  url?: string;
}

export interface UploadedFileResult {
  id: number;
  storedName: string;
  originalName: string;
  url: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export function useFileUpload() {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const createJob = useCallback((file: File, duration: string): UploadJob => {
    const job: UploadJob = {
      id: Math.random().toString(36).substring(2, 15),
      file,
      duration,
      progress: 0,
      status: 'pending',
    };
    setJobs((prev) => [...prev, job]);
    return job;
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  const updateJob = useCallback((jobId: string, updates: Partial<UploadJob>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  }, []);

  const uploadFile = useCallback(
    async (job: UploadJob): Promise<UploadedFileResult> => {
      const { file, duration } = job;

      updateJob(job.id, { status: 'uploading', progress: 0 });

      // Step 1: Initialize upload
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalName: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          duration,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({ error: 'Init failed' }));
        throw new Error(err.error || 'Failed to initialize upload');
      }

      const { uploadId, maxChunkSize } = await initRes.json();
      const chunkSize = maxChunkSize || CHUNK_SIZE;
      const totalChunks = Math.ceil(file.size / chunkSize);

      // Step 2: Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const chunkRes = await fetch(`/api/upload/chunk/${uploadId}`, {
          method: 'POST',
          headers: {
            'x-chunk-index': String(i),
            'x-total-chunks': String(totalChunks),
          },
          body: chunk,
        });

        if (!chunkRes.ok) {
          const err = await chunkRes.json().catch(() => ({ error: 'Chunk failed' }));
          throw new Error(err.error || `Failed to upload chunk ${i + 1}`);
        }

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        updateJob(job.id, { progress });
      }

      // Step 3: Finalize
      updateJob(job.id, { status: 'finalizing', progress: 100 });

      const finalizeRes = await fetch(`/api/upload/finalize/${uploadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalName: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          duration,
        }),
      });

      if (!finalizeRes.ok) {
        const err = await finalizeRes.json().catch(() => ({ error: 'Finalize failed' }));
        throw new Error(err.error || 'Failed to finalize upload');
      }

      const result = await finalizeRes.json();
      const fileResult = result.file as UploadedFileResult;
      updateJob(job.id, { status: 'completed', url: fileResult.url });

      return fileResult;
    },
    [updateJob]
  );

  return {
    jobs,
    createJob,
    removeJob,
    uploadFile,
  };
}
