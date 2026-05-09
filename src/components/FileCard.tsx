import { useState } from 'react';
import { Copy, Check, Trash2, FileText, Image, Film, Music, Archive, Code, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { File as DbFile } from '@db/schema';

interface FileCardProps {
  file: DbFile;
  onCopy: (url: string) => void;
  onDelete: (id: number) => void;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={20} className="text-cyan-400" />;
  if (type.startsWith('video/')) return <Film size={20} className="text-pink-400" />;
  if (type.startsWith('audio/')) return <Music size={20} className="text-amber-400" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <Archive size={20} className="text-orange-400" />;
  if (type.includes('json') || type.includes('xml') || type.includes('html')) return <Code size={20} className="text-green-400" />;
  return <FileText size={20} className="text-blue-400" />;
}

export default function FileCard({ file, onCopy, onDelete }: FileCardProps) {
  const [copied, setCopied] = useState(false);
  const isImage = file.mimeType.startsWith('image/');
  const uploadDate = new Date(file.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const url = `${window.location.origin}/f/${file.storedName}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    onCopy(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getExpiryText = () => {
    if (!file.expiresAt) return 'Never expires';
    const now = new Date();
    const exp = new Date(file.expiresAt);
    const diff = exp.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    if (hours < 24) return `Expires in ${hours}h`;
    const days = Math.ceil(hours / 24);
    return `Expires in ${days}d`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass rounded-xl overflow-hidden group hover:border-primary/30 transition-colors"
    >
      {isImage && (
        <div className="relative aspect-video overflow-hidden bg-secondary">
          <img
            src={`/f/${file.storedName}`}
            alt={file.originalName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {!isImage && (
            <div className="p-2 bg-secondary rounded-lg shrink-0">
              {getFileIcon(file.mimeType)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={file.originalName}>
              {file.originalName}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{uploadDate}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Clock size={10} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{getExpiryText()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check size={14} className="mr-1.5 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} className="mr-1.5" />
                Copy Link
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(file.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
