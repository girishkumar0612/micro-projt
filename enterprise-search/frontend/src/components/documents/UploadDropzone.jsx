import { useCallback, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

export default function UploadDropzone({ onFileSelected, uploading, progress }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected]
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200
        ${
          isDragging
            ? 'border-brand-indigo bg-brand-gradient-soft scale-[1.01]'
            : 'border-ink/15 bg-white hover:border-brand-indigo/40 hover:bg-brand-gradient-soft/40'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          e.target.value = ''
        }}
      />

      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-gradient flex items-center justify-center animate-floatSlow">
        <UploadCloud size={24} className="text-white" />
      </div>

      {uploading ? (
        <div className="max-w-xs mx-auto">
          <p className="text-sm font-medium text-ink mb-2">Indexing document… {progress}%</p>
          <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <div
              className="h-full bg-brand-gradient transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-ink">Drop a PDF here, or click to browse</p>
          <p className="text-xs text-ink-faint mt-1">PDF only · up to 20MB</p>
        </>
      )}
    </div>
  )
}
