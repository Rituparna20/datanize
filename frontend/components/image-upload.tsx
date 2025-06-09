"use client"

import React, { useState } from "react"
import { Upload, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

interface ImageUploadProps {
  setImages: (images: string[]) => void
}

export function ImageUpload({ setImages }: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  const API_URL = 'https://software-datanize.onrender.com'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (e.target.files && e.target.files.length > 0) {
      // Validate file types
      const invalidFiles = Array.from(e.target.files).filter(
        file => !file.type.startsWith('image/')
      )
      
      if (invalidFiles.length > 0) {
        setError('Please select only image files')
        return
      }
      
      setSelectedFiles(e.target.files)
    }
  }

  const handleUpload = async () => {
    if (!selectedFiles) return
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Please log in to upload images')
      return
    }
    
    setUploading(true)
    setError(null)
    const uploadedPaths: string[] = []
  
    for (const file of Array.from(selectedFiles)) {
      try {
        // Generate a unique file name
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })
  
        if (error) {
          if (error.message.includes('duplicate')) {
            throw new Error('A file with this name already exists')
          }
          throw error
        }
  
        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)
  
        if (!publicUrl) {
          throw new Error('Failed to get public URL for uploaded file')
        }
  
        uploadedPaths.push(publicUrl)
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        setError(error instanceof Error ? error.message : 'Failed to upload file')
        continue
      }
    }
  
    if (uploadedPaths.length > 0) {
      setImages(uploadedPaths)
      setSelectedFiles(null) // Clear selected files after successful upload
    } else {
      setError('No files were uploaded successfully')
    }
    setUploading(false)
  }
  
  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="images">Images</Label>
        <input
          id="images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="bg-white text-charcoal border border-lightgrey rounded px-4 py-2 font-medium cursor-pointer w-full text-left hover:bg-softindigo hover:text-white transition-colors"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {selectedFiles && selectedFiles.length > 0
            ? Array.from(selectedFiles).map((file) => file.name).join(', ')
            : 'Choose Files'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      )}

      {selectedFiles && (
        <div className="text-sm">
          {Array.from(selectedFiles).map((file, index) => (
            <div key={index} className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span>{file.name}</span>
            </div>
          ))}
        </div>
      )}

      <Button 
        onClick={handleUpload} 
        disabled={!selectedFiles || uploading}
        className={uploading ? 'opacity-50 cursor-not-allowed' : ''}
      >
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : "Upload Images"}
      </Button>
    </div>
  )
}
