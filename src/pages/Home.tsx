import { useCallback } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import UploadZone from '@/components/UploadZone';
import FileList from '@/components/FileList';
import Features from '@/components/Features';
import Footer from '@/components/Footer';
import { ToastContainer, useToast } from '@/components/Toast';
import type { UploadedFileResult } from '@/hooks/useFileUpload';

export default function Home() {
  const { toasts, addToast } = useToast();

  const handleUploadComplete = useCallback((file: UploadedFileResult) => {
    addToast(`Uploaded: ${file.originalName}`, 'success');
  }, [addToast]);

  const handleCopy = useCallback(() => {
    addToast('Link copied to clipboard!', 'success');
  }, [addToast]);

  return (
    <div className="min-h-screen bg-[#0f0f11] text-foreground">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <Hero />
        <UploadZone onUploadComplete={handleUploadComplete} />
        <FileList onCopy={handleCopy} />
        <Features />
      </main>
      <Footer />
      <ToastContainer toasts={toasts} />
    </div>
  );
}
