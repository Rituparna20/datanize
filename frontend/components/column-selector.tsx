"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/file-upload"
import { useToast } from "@/hooks/use-toast"
import { API_BASE_URL } from "@/lib/constants"
import { supabase } from "@/lib/supabase"

interface ColumnSelectorProps {
  xColumn: string
  setXColumn: (value: string) => void
  yColumn: string
  setYColumn: (value: string) => void
  onFileUpload: (path: string) => void
}

export function ColumnSelector({ 
  xColumn, 
  setXColumn, 
  yColumn, 
  setYColumn,
  onFileUpload 
}: ColumnSelectorProps) {
  const [columns, setColumns] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const fetchColumns = async (filePath: string) => {
    if (!filePath) {
      console.error("No file path provided")
      setColumns([])
      return
    }

    try {
      setIsLoading(true)
      console.log("Fetching columns for file:", filePath)
      const response = await fetch(`${API_BASE_URL}/preprocess/columns?file_path=${encodeURIComponent(filePath)}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch columns' }))
        throw new Error(errorData.detail || 'Failed to fetch columns')
      }

      const data = await response.json()
      console.log("Received columns data:", data)

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server')
      }

      if (!data.columns || !Array.isArray(data.columns)) {
        throw new Error('Invalid columns data received from server')
      }

      setColumns(data.columns)
    } catch (error) {
      console.error("Failed to fetch columns:", error)
      setColumns([])
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch columns from the file",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUploadComplete = async (filePath: string) => {
    try {
      // Call the parent's onFileUpload with the file path
      onFileUpload(filePath)
      
      // Fetch columns for the uploaded file
      await fetchColumns(filePath)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Upload Dataset</Label>
        <FileUpload 
          onUploadComplete={handleFileUploadComplete}
          acceptedFileTypes={[".csv", ".xlsx", ".xls"]}
        />
      </div>

      {columns.length > 0 && !isLoading && (
        <>
          <div className="space-y-2">
            <Label>X-Axis Column</Label>
            <Select value={xColumn} onValueChange={setXColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select X-axis column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Y-Axis Column</Label>
            <Select value={yColumn} onValueChange={setYColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select Y-axis column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      
      {isLoading && (
        <div className="text-sm text-muted-foreground">
          Loading columns...
        </div>
      )}
    </div>
  )
}
