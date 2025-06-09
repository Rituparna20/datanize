// image-labeler.tsx
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Save, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { toast } from "@/components/ui/use-toast"

interface Label {
  label: string
  bbox: [number, number, number, number] // x, y, width, height
  confidence: number
}

interface ImageLabelerProps {
  images: string[]
  setLabels?: (labels: Record<number, Label[]>) => void
}

const OBJECT_CLASSES = ["Person", "Car", "Tree", "Animal", "Building"]
const API_URL = 'https://software-datanize.onrender.com'

export function ImageLabeler({ images, setLabels }: ImageLabelerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [annotations, setAnnotations] = useState<Record<number, Label[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateLabels = (newLabels: Record<number, Label[]>) => {
    setAnnotations(newLabels)
    setLabels?.(newLabels) // Only call setLabels if it exists
  }

  useEffect(() => {
    if (images[currentIndex]) {
      detectObjectsInImage()
    }
  }, [currentIndex])

  const detectObjectsInImage = async () => {
    try {
      setError(null)
      setIsDetecting(true)
      const imageUrl = images[currentIndex]
      console.log("🔼 Processing image:", imageUrl)

      // Create a FormData object
      const formData = new FormData()
      
      // Fetch the image and add it to FormData
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image')
      }
      
      const imageBlob = await imageResponse.blob()
      formData.append('file', imageBlob, 'image.jpg')

      console.log("Sending detection request to:", `${API_URL}/image/detect`)
      const response = await axios.post(
        `${API_URL}/image/detect`,
        formData,
        { 
          headers: { 
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      console.log("Detection response:", response.data)

      if (!response.data || !Array.isArray(response.data.boxes)) {
        throw new Error('Invalid response format from server')
      }

      const detectedBoxes = response.data.boxes as Label[]
      console.log(`Detected ${detectedBoxes.length} objects:`, detectedBoxes)

      if (detectedBoxes.length === 0) {
        toast({
          title: "No objects detected",
          description: "YOLO model didn't detect any objects in this image.",
          variant: "default"
        })
      }

      updateLabels({
        ...annotations,
        [currentIndex]: detectedBoxes
      })

    } catch (err: any) {
      console.error("❌ Detection failed", err)
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to detect objects'
      setError(errorMessage)
      toast({
        title: "Detection failed",
        description: errorMessage,
        variant: "destructive"
      })
      updateLabels({
        ...annotations,
        [currentIndex]: []
      })
    } finally {
      setIsDetecting(false)
    }
  }

  const handleRetryDetection = () => {
    detectObjectsInImage()
  }

  const handleLabelChange = (boxIndex: number, newLabel: string) => {
    const updatedBoxes = [...(annotations[currentIndex] || [])]
    updatedBoxes[boxIndex].label = newLabel
    updateLabels({
      ...annotations,
      [currentIndex]: updatedBoxes
    })
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1))
  }

  const handleSaveLabels = async () => {
    try {
      setIsSaving(true)
      setError(null)

      // Validate if we have any images
      if (images.length === 0) {
        toast({
          title: "No images to export",
          description: "Please upload some images first.",
          variant: "destructive"
        })
        return
      }

      // Validate if we have any labels
      const totalAnnotations = Object.values(annotations).reduce((sum, labels) => sum + labels.length, 0)
      if (totalAnnotations === 0) {
        toast({
          title: "No labels to export",
          description: "Please label at least one object before exporting.",
          variant: "destructive"
        })
        return
      }

      // Validate all labels have been assigned
      const hasUnassignedLabels = Object.values(annotations).some(
        imageLabels => imageLabels.some(label => !label.label)
      )
      if (hasUnassignedLabels) {
        const proceed = window.confirm(
          "Some objects have unassigned labels. Do you want to proceed with the export anyway?"
        )
        if (!proceed) return
      }

      const response = await axios.post(`${API_URL}/image/save-labels`, {
        images: images,
        labels: annotations
      })

      if (response.data) {
        const { yaml_path, filename, summary } = response.data
        
        // Validate the response
        if (!yaml_path || !filename) {
          throw new Error("Invalid response from server: missing file information")
        }

        try {
          // Create a download link
          const downloadUrl = `${API_URL}${yaml_path}`
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = filename
          document.body.appendChild(link)
          
          // Test if the file exists before triggering download
          const testResponse = await fetch(downloadUrl, { method: 'HEAD' })
          if (!testResponse.ok) {
            throw new Error('Generated file not found on server')
          }
          
          link.click()
          document.body.removeChild(link)

          toast({
            title: "Labels exported successfully",
            description: `Saved ${summary.total_annotations} annotations across ${summary.total_images} images to ${filename}`,
          })
        } catch (downloadError) {
          console.error("Download failed:", downloadError)
          toast({
            title: "Export succeeded but download failed",
            description: `File was saved as ${filename} on the server but couldn't be downloaded. Please try again or contact support.`,
            variant: "destructive"
          })
        }
      }
    } catch (err: any) {
      console.error("Failed to save labels:", err)
      const errorMessage = err.response?.data?.detail || err.message || "Failed to save labels"
      setError(errorMessage)
      
      // Provide more specific error messages
      let toastMessage = "Failed to export labels"
      if (err.response?.status === 400) {
        toastMessage = "Invalid data: Please check your labels"
      } else if (err.response?.status === 500) {
        toastMessage = "Server error: Please try again later"
      }
      
      toast({
        title: toastMessage,
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const currentBoxes = annotations[currentIndex] || []

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full h-[400px] border rounded-md overflow-hidden bg-black flex items-center justify-center">
        {isDetecting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white z-10">
            Detecting objects...
          </div>
        )}
        <Image
          src={images[currentIndex] || "/placeholder.svg"}
          alt={`Image ${currentIndex + 1}`}
          fill
          className="object-contain w-full h-full"
        />
        {currentBoxes.map((box, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${box.bbox[0]}%`,
              top: `${box.bbox[1]}%`,
              width: `${box.bbox[2] - box.bbox[0]}%`,
              height: `${box.bbox[3] - box.bbox[1]}%`,
              border: "2px solid red",
              backgroundColor: "rgba(255, 0, 0, 0.1)",
              zIndex: 5,
            }}
          >
            <div className="absolute top-0 left-0 bg-red-500 text-white px-1 text-sm">
              {box.label} ({Math.round(box.confidence * 100)}%)
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded border border-red-200">
          Error: {error}
          <Button
            onClick={handleRetryDetection}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry Detection
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {currentBoxes.length === 0 && !isDetecting && (
          <div className="text-sm text-gray-500">
            No objects detected in this image.
            <Button
              onClick={handleRetryDetection}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry Detection
            </Button>
          </div>
        )}
        
        {currentBoxes.map((box, i) => {
          // Build dropdown options: 'N/A', detected label first, then other classes (excluding duplicate)
          const labelOptions = ["N/A", box.label, ...OBJECT_CLASSES.filter(cls => cls !== box.label && cls !== "N/A")];
          return (
            <div key={i} className="flex gap-2 items-center">
              <span>Object {i + 1}</span>
              <select
                value={box.label}
                onChange={(e) => handleLabelChange(i, e.target.value)}
                className="border p-1 rounded"
              >
                <option value="">Select Label</option>
                {labelOptions.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                Confidence: {Math.round(box.confidence * 100)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0 || isDetecting}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <span className="text-sm">{currentIndex + 1} of {images.length}</span>
        <Button variant="outline" onClick={handleNext} disabled={currentIndex === images.length - 1 || isDetecting}>
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-end mt-4">
        <Button 
          onClick={handleSaveLabels} 
          disabled={isSaving || Object.keys(annotations).length === 0}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Export to YAML"}
        </Button>
      </div>
    </div>
  )
}
