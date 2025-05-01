"use client"

import React, { useState } from "react"
import { Upload, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ImageUploadProps {
  setImages: (images: string[]) => void
}

export function ImageUpload({ setImages }: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
    
    setUploading(true)
    setError(null)
    const uploadedPaths: string[] = []
  
    for (const file of Array.from(selectedFiles)) {
      const formData = new FormData()
      formData.append("file", file)
  
      try {
        console.log('Uploading to:', `${API_URL}/image/upload`)
        const response = await fetch(`${API_URL}/image/upload`, {
          method: "POST",
          body: formData,
        })
  
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: response.statusText }))
          throw new Error(errorData.detail || `Upload failed: ${response.statusText}`)
        }
  
        const data = await response.json()
        if (!data || !data.file_path) {
          throw new Error('Invalid response from server')
        }
  
        // Construct the full URL for the image
        const imageUrl = `${API_URL}/${data.file_path.replace(/^\/+/, '')}`
        console.log('Image URL:', imageUrl)
        uploadedPaths.push(imageUrl)

        // Extract dominant color and set background
        
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
