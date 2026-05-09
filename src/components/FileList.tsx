import { AnimatePresence } from 'framer-motion';
import { FileX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileCard from './FileCard';
import { trpc } from '@/providers/trpc';

interface FileListProps {
  onCopy: (url: string) => void;
}

export default function FileList({ onCopy }: FileListProps) {
  const { data: files, isLoading } = trpc.file.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.file.delete.useMutation({
    onSuccess: () => {
      utils.file.list.invalidate();
    },
  });

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleClearAll = () => {
    files?.forEach((f) => {
      deleteMutation.mutate({ id: f.id });
    });
  };

  if (isLoading) {
    return (
      <div id="files" className="w-full py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div id="files" className="w-full py-16">
        <div className="text-center">
          <div className="inline-flex p-4 bg-secondary rounded-full mb-4">
            <FileX size={32} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No files yet</h3>
          <p className="text-sm text-muted-foreground">
            Upload some files to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="files" className="w-full py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Your Files</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {files.length} {files.length === 1 ? 'file' : 'files'} uploaded
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleClearAll}
        >
          <Trash2 size={14} className="mr-1.5" />
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onCopy={onCopy}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
