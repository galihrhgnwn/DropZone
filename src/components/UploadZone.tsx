import { useState, useRef, useCallback } from 'react';
import { Upload, File, Clock, Infinity, ChevronDown, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { useFileUpload, type UploadedFileResult } from '@/hooks/useFileUpload';
import { trpc } from '@/providers/trpc';

interface UploadZoneProps {
  onUploadComplete: (file: UploadedFileResult) => void;
}

type DurationOption = 'forever' | '2' | '6' | '24' | '48' | '168';

const durationOptions: { value: DurationOption; label: string; icon: React.ReactNode }[] = [
  { value: 'forever', label: 'Forever', icon: <Infinity size={14} /> },
  { value: '2', label: '2 hours', icon: <Clock size={14} /> },
  { value: '6', label: '6 hours', icon: <Clock size={14} /> },
  { value: '24', label: '1 day', icon: <Clock size={14} /> },
  { value: '48', label: '2 days', icon: <Clock size={14} /> },
  { value: '168', label: '1 week', icon: <Clock size={14} /> },
];

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [duration, setDuration] = useState<DurationOption>('forever');
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { jobs, createJob, removeJob, uploadFile } = useFileUpload();
  const utils = trpc.useUtils();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024 * 1024); // 10GB limit

      for (const file of validFiles) {
        const job = createJob(file, duration);
        try {
          const result = await uploadFile(job);
          onUploadComplete(result);
          utils.file.list.invalidate();
          setTimeout(() => removeJob(job.id), 2000);
        } catch (err) {
          console.error(err);
        }
      }
    },
    [createJob, uploadFile, onUploadComplete, removeJob, utils, duration]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleCopyLink = (url: string, jobId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2000);
  };

  return (
    <div id="upload" className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Upload your <span className="text-gradient">files</span>
        </h2>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Drag and drop your files here. Supports files up to 10GB.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl p-8 sm:p-12 transition-all duration-300 ${
            isDragging
              ? 'gradient-border glow-blue scale-[1.02]'
              : 'border-2 border-dashed border-border hover:border-primary/50 hover:glow-blue'
          }`}
          style={{ background: 'rgba(24, 24, 27, 0.4)' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={isDragging ? { y: -5, scale: 1.1 } : { y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={`p-4 rounded-full ${
                isDragging ? 'bg-primary/20' : 'bg-secondary'
              }`}
            >
              <Upload
                size={32}
                className={isDragging ? 'text-primary' : 'text-muted-foreground'}
              />
            </motion.div>

            <div className="text-center">
              <p className="text-lg font-medium mb-1">
                {isDragging ? 'Drop files here' : 'Drag & drop your files'}
              </p>
              <p className="text-sm text-muted-foreground">
                or <span className="text-primary">click to browse</span>
              </p>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Duration:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDurationPicker(!showDurationPicker);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs font-medium hover:bg-white/5 transition-colors"
              >
                {durationOptions.find((d) => d.value === duration)?.icon}
                {durationOptions.find((d) => d.value === duration)?.label}
                <ChevronDown size={12} />
              </button>
            </div>

            {showDurationPicker && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-strong rounded-xl p-2 min-w-[180px] z-10"
              >
                {durationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDuration(opt.value);
                      setShowDurationPicker(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors ${
                      duration === opt.value
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:bg-white/5'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Maximum file size: 10GB
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 space-y-3"
          >
            {jobs.map((job) => (
              <div
                key={job.id}
                className="glass rounded-xl p-4 flex items-center gap-4"
              >
                <div className="p-2 bg-secondary rounded-lg">
                  <File size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(job.file.size)}
                  </p>
                  {job.status === 'error' ? (
                    <p className="text-xs text-destructive mt-1">{job.error}</p>
                  ) : job.status === 'completed' && job.url ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={job.url}
                        readOnly
                        className="flex-1 bg-secondary/50 border border-primary/30 rounded px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:border-primary/50 cursor-text"
                      />
                      <button
                        onClick={() => handleCopyLink(job.url!, job.id)}
                        className="p-1.5 bg-primary/20 hover:bg-primary/30 rounded transition-colors flex-shrink-0"
                        title="Copy link"
                      >
                        {copiedJobId === job.id ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} className="text-primary" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Progress value={job.progress} className="h-1.5" />
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {job.status === 'completed' ? (
                    <span className="text-green-400 flex items-center gap-1">
                      Done
                    </span>
                  ) : job.status === 'error' ? (
                    <span className="text-destructive">Failed</span>
                  ) : (
                    `${job.progress}%`
                  )}
                </div>
                <button
                  onClick={() => removeJob(job.id)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
