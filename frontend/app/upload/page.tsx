"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadFile } from "@/lib/api"
import { FileSpreadsheet, FolderOpen, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [outputFolder, setOutputFolder] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOutputFolder(e.target.value)
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const response = await uploadFile(file)
      setUploadedFilePath(response.file_path)
      toast({
        title: "Success",
        description: "File uploaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Data</h1>
        <p className="text-muted-foreground">Upload your Excel file for preprocessing and select an output folder</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
            <CardDescription>Select an Excel file (.xlsx, .xls) for preprocessing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="file">Excel File</Label>
                <div className="flex items-center gap-2">
                  <Input id="file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                </div>
                {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="folder">Output Folder</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="folder"
                    placeholder="Enter output folder path"
                    value={outputFolder}
                    onChange={handleFolderChange}
                  />
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <Button onClick={handleUpload} disabled={isUploading || !file} className="w-full">
                {isUploading ? (
                  "Uploading..."
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Upload File
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Status</CardTitle>
            <CardDescription>View the status of your uploaded file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">File Status</h3>
                {uploadedFilePath ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Status:</span> Uploaded successfully
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">File Path:</span> {uploadedFilePath}
                    </p>
                    <p className="text-sm text-green-600">Ready for preprocessing</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No file uploaded yet</p>
                )}
              </div>

              {uploadedFilePath && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium">Next Steps</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Proceed to the Preprocessing section to handle missing values and encode categorical variables.
                  </p>
                  <Button variant="outline" className="mt-4 w-full" asChild>
                    <a href="/preprocess">Go to Preprocessing</a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
