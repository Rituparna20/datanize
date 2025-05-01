"use client"

import { useState } from "react"
import { Folder, File } from "lucide-react"
import { uploadFile } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useDataStore } from "@/lib/store"

interface FolderSelectionProps {
  onFileSelect?: (filePath: string, columns: string[]) => void;
}

export function FolderSelection({ onFileSelect }: FolderSelectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { setFileData, clearFileData, resetPreprocessState } = useDataStore()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['.csv', '.xls', '.xlsx']
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (!validTypes.includes(fileExtension)) {
        toast.error("Please select a valid Excel or CSV file")
        return
      }
      setSelectedFile(file)
      clearFileData() // Clear previous file data when new file is selected
      resetPreprocessState() // Reset preprocessing state
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first")
      return
    }

    setIsLoading(true)
    try {
      const response = await uploadFile(selectedFile)
      
      if (response && response.file_path && response.columns) {
        const fileData = {
          path: response.file_path,
          columns: response.columns
        }
        
        // Store in global state
        setFileData(fileData)
        
        toast.success("File uploaded successfully! You can now proceed with preprocessing.")
        
        if (onFileSelect && typeof onFileSelect === 'function') {
          onFileSelect(response.file_path, response.columns)
        }
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload file: " + (error as Error).message)
      clearFileData() // Clear file data on error
    } finally {
      setIsLoading(false)
      // Clear the input
      const input = document.getElementById('file-upload') as HTMLInputElement
      if (input) input.value = ''
      setSelectedFile(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data File</CardTitle>
        <CardDescription>Select and upload your Excel (.xls/.xlsx) or CSV file for preprocessing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="file-upload">Data File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={isLoading}
            />
          </div>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? (
              "Uploading..."
            ) : (
              <>
                <File className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
        {selectedFile && (
          <p className="mt-2 text-sm text-muted-foreground">
            Selected file: {selectedFile.name}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
