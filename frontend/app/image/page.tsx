// page.tsx
"use client"

import { useState } from "react"
import { ImageUpload } from "@/components/image-upload"
import { ImageLabeler } from "@/components/image-labeler"
import { Button } from "@/components/ui/button"
import { Download, Upload } from "lucide-react"
import axios from "axios"

interface Label {
  label: string
  bbox: [number, number, number, number] // x, y, width, height
}

export default function ImagePage() {
  const [images, setImages] = useState<string[]>([])
  const [labels, setLabels] = useState<Record<number, Label[]>>({})
  const [yamlPath, setYamlPath] = useState<string | null>(null)

  const handleExportYaml = async () => {
    const response = await axios.post("http://localhost:8000/image/save-labels", { images, labels })
    setYamlPath(response.data.yaml_path)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Image Labeling Tool</h1>
      <ImageUpload setImages={setImages} />

      {images.length > 0 && (
        <ImageLabeler images={images} setLabels={setLabels} />
      )}

      {Object.keys(labels).length > 0 && (
        <Button onClick={handleExportYaml}>
          <Upload className="mr-2 h-4 w-4" />
          Export YAML
        </Button>
      )}

      {yamlPath && (
        <a href={yamlPath} download className="text-blue-500 underline">
          <Download className="inline-block mr-1" />
          Download Labeled YAML
        </a>
      )}
    </div>
  )
}
