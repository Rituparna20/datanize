"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

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

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Please log in to upload files')
      return
    }

    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }

    setIsUploading(true)
    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        if (uploadError.message.includes('duplicate')) {
          throw new Error('A file with this name already exists')
        }
        throw uploadError
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(fileName)

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file')
      }

      // Call the onUploadComplete callback with the file path
      if (typeof onUploadComplete === 'function') {
        onUploadComplete(publicUrl)
      }
      toast.success("File uploaded successfully")
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
