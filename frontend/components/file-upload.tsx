"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface FileUploadProps {
  onUploadComplete: (filePath: string) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number // in bytes, default 10MB
}

const DEFAULT_ACCEPTED_TYPES = [".csv", ".xlsx", ".xls"]
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function FileUpload({ 
  onUploadComplete, 
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const validateFile = (file: File): string | null => {
    if (!file) return "No file selected"
    
    if (file.size === 0) return "File is empty"
    
    if (file.size > maxFileSize) {
      return `File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`
    }

    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
    if (!acceptedFileTypes.includes(fileExtension)) {
      return `Invalid file type. Accepted types: ${acceptedFileTypes.join(', ')}`
    }

    return null
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const uploadResponse = await fetch('http://localhost:8000/upload/file', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Upload failed')
      }

      const uploadData = await uploadResponse.json()
      if (!uploadData.file_path) {
        throw new Error('No file path received from server')
      }

      // Remove any duplicate 'uploads' in the path
      const cleanPath = uploadData.file_path.replace(/uploads\/uploads/, 'uploads')

      // Validate the uploaded file
      const validateResponse = await fetch(`http://localhost:8000/upload/validate-file?file_path=${encodeURIComponent(cleanPath)}`)
      if (!validateResponse.ok) {
        const validateError = await validateResponse.json()
        throw new Error(validateError.detail || 'File validation failed')
      }

      const validateData = await validateResponse.json()
      
      if (typeof onUploadComplete === 'function') {
        onUploadComplete(cleanPath)
      }
      toast.success("File uploaded and validated successfully")
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to upload file")
    } finally {
      setIsUploading(false)
      // Clear the input
      event.target.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        className="relative"
        disabled={isUploading}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept={acceptedFileTypes.join(',')}
        />
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? "Uploading..." : "Upload File"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Supported formats: {acceptedFileTypes.join(', ')} (max {maxFileSize / (1024 * 1024)}MB)
      </p>
    </div>
  )
}
