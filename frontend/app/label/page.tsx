"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, Save, FileDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Detection {
  label: string
  confidence: number
  bbox: [number, number, number, number] // [x1, y1, x2, y2]
}

interface ImageData {
  id: number
  path: string
  detections: Detection[]
  selectedLabels: { [key: string]: string } // Maps detection index to selected label
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function LabelPage() {
  const [images, setImages] = useState<ImageData[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [processingProgress, setProcessingProgress] = useState<number>(0)
  const { toast } = useToast()

  const handleFileUpload = async (files: FileList) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Validate files
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/') || 
        ['jpg', 'jpeg', 'png'].includes(file.name.split('.').pop()?.toLowerCase() || '')
      )

      if (imageFiles.length === 0) {
        toast({ title: 'Error', description: 'No valid image files found in the selected folder', variant: 'destructive' })
        return
      }

      // Upload files with progress tracking
      const totalFiles = imageFiles.length
      const uploadedImages: ImageData[] = []

      for (let i = 0; i < imageFiles.length; i++) {
        try {
          const formData = new FormData()
          formData.append('file', imageFiles[i])

          const response = await fetch(`${API_BASE_URL}/label/upload-images`, {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(error || 'Failed to upload image')
          }

          const data = await response.json()
          uploadedImages.push({
            id: i,
            path: data.image_path,
            detections: data.detections || [],
            selectedLabels: {}
          })

          // Update progress
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
          
          // Show progress in toast
          if ((i + 1) % 5 === 0 || i === totalFiles - 1) {
            toast({ title: 'Success', description: `Uploaded ${i + 1} of ${totalFiles} images` })
          }
        } catch (error) {
          console.error(`Error uploading ${imageFiles[i].name}:`, error)
          toast({ title: 'Error', description: `Failed to upload ${imageFiles[i].name}`, variant: 'destructive' })
          // Continue with next file
          continue
        }
      }

      if (uploadedImages.length > 0) {
        setImages(uploadedImages)
        toast({ title: 'Success', description: `Successfully uploaded ${uploadedImages.length} images` })
      } else {
        toast({ title: 'Error', description: 'No images were successfully uploaded', variant: 'destructive' })
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: 'Error', description: 'Failed to upload images: ' + (error instanceof Error ? error.message : 'Unknown error'), variant: 'destructive' })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleLabelSelect = (detectionIndex: number, label: string) => {
    setImages(prev => {
      const newImages = [...prev]
      const currentImage = { ...newImages[currentImageIndex] }
      currentImage.selectedLabels = {
        ...currentImage.selectedLabels,
        [detectionIndex]: label
      }
      newImages[currentImageIndex] = currentImage
      return newImages
    })
  }

  const handleSaveLabels = async () => {
    if (!images[currentImageIndex]) return

    try {
      const response = await fetch(`${API_BASE_URL}/label/save-labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_path: images[currentImageIndex].path,
          labels: images[currentImageIndex].selectedLabels,
          detections: images[currentImageIndex].detections,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to save labels')
      }

      toast({ title: 'Success', description: 'Labels saved successfully' })

      // Move to next image if available
      if (currentImageIndex < images.length - 1) {
        setCurrentImageIndex(prev => prev + 1)
      }
    } catch (error) {
      console.error('Save error:', error)
      toast({ title: 'Error', description: 'Failed to save labels: ' + (error instanceof Error ? error.message : 'Unknown error'), variant: 'destructive' })
    }
  }

  const handleExportYAML = async () => {
    try {
      setIsExporting(true)

      // Validate if there are any images with labels
      if (images.length === 0) {
        toast({ title: 'Error', description: 'No images to export', variant: 'destructive' })
        return
      }

      const response = await fetch(`${API_BASE_URL}/label/export-yaml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-yaml',
        },
        body: JSON.stringify(images),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to export YAML')
      }

      // Get the filename from the response headers or use default
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'labels.yaml'

      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({ 
        title: 'Success', 
        description: `YAML file "${filename}" downloaded successfully`,
        duration: 3000
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({ 
        title: 'Error', 
        description: 'Failed to export YAML: ' + (error instanceof Error ? error.message : 'Unknown error'), 
        variant: 'destructive',
        duration: 5000
      })
    } finally {
      setIsExporting(false)
    }
  }

  const currentImage = images[currentImageIndex]

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Labeling</h1>
      
      {/* File Upload Section */}
      <div className="mb-4">
        <input
          type="file"
          // @ts-ignore
          webkitdirectory="true"
          // @ts-ignore
          directory=""
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id="folder-upload"
          disabled={isUploading || isProcessing}
        />
        <label
          htmlFor="folder-upload"
          className={`cursor-pointer bg-blue-500 text-white px-4 py-2 rounded ${
            (isUploading || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload Folder'}
        </label>
      </div>

      {/* Progress Bars */}
      {isUploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Image Navigation */}
      {images.length > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
            disabled={currentImageIndex === 0}
            className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>Image {currentImageIndex + 1} of {images.length}</span>
          <button
            onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
            disabled={currentImageIndex === images.length - 1}
            className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={handleSaveLabels}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Save Labels
          </button>
          <button
            onClick={handleExportYAML}
            disabled={isExporting}
            className={`bg-purple-500 text-white px-4 py-2 rounded ${
              isExporting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isExporting ? 'Exporting...' : 'Export YAML'}
          </button>
        </div>
      )}

      {/* Image Display and Labeling */}
      {images.length > 0 && images[currentImageIndex] && (
        <div className="relative w-full h-[400px] border rounded-md overflow-hidden bg-black flex items-center justify-center mb-4">
          <img
            src={`${API_BASE_URL}/label/images/${encodeURIComponent(images[currentImageIndex].path)}`}
            alt={`Image ${currentImageIndex + 1}`}
            className="object-contain w-full h-full"
            style={{ maxHeight: 400 }}
          />
          {/* Render bounding boxes and labels here */}
          {images[currentImageIndex].detections.map((detection, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${detection.bbox[0]}%`,
                top: `${detection.bbox[1]}%`,
                width: `${detection.bbox[2] - detection.bbox[0]}%`,
                height: `${detection.bbox[3] - detection.bbox[1]}%`,
                border: '2px solid red',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
              }}
            >
              <div className="absolute top-0 left-0 bg-red-500 text-white px-1 text-sm">
                {images[currentImageIndex].selectedLabels[index] || detection.label}
                ({Math.round(detection.confidence * 100)}%)
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Dynamic dropdowns for each detection */}
      {images.length > 0 && images[currentImageIndex] && images[currentImageIndex].detections.map((detection, index) => {
        // Build dropdown options: 'N/A', detected label first, then other classes (excluding duplicate)
        const OBJECT_CLASSES = ["N/A", detection.label, "Person", "Car", "Tree", "Animal", "Building"].filter((cls, i, arr) => arr.indexOf(cls) === i);
        return (
          <div key={index} className="flex gap-2 items-center mb-2">
            <span>Object {index + 1}</span>
            <select
              value={images[currentImageIndex].selectedLabels[index] || detection.label}
              onChange={e => handleLabelSelect(index, e.target.value)}
              className="border p-1 rounded"
            >
              <option value="">Select Label</option>
              {OBJECT_CLASSES.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              Confidence: {Math.round(detection.confidence * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  )
} 