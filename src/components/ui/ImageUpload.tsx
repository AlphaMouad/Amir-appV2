import React, { useCallback, useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function ImageUpload({ onImageSelected, onClear, isLoading = false }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  }, [onImageSelected]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [onImageSelected]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    onImageSelected(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreview(null);
    onClear();
  };

  if (preview) {
    return (
      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <button
              onClick={clearImage}
              className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-32 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center overflow-hidden
        ${dragActive ? 'border-amber-600 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={isLoading}
      />
      <div className="flex flex-col items-center justify-center pointer-events-none text-slate-500 space-y-2">
        <UploadCloud className={`h-8 w-8 ${dragActive ? 'text-amber-600' : 'text-slate-400'}`} />
        <span className="text-xs font-medium text-center px-4">
          <span className="text-amber-700 font-semibold">Click to upload</span> or drag and drop<br />
          SVG, PNG, JPG or GIF
        </span>
      </div>
    </div>
  );
}
