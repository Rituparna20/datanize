"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartSelector } from "@/components/chart-selector"
import { ColumnSelector } from "@/components/column-selector"
import { ChartPreview } from "@/components/chart-preview"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const VALID_CHART_TYPES = ['bar', 'line', 'pie', 'scatter']

interface ChartDataPoint {
  [key: string]: string | number
}

interface ChartResponse {
  chart_data: ChartDataPoint[]
  message: string
}

export default function VisualizePage() {
  const [chartType, setChartType] = useState("bar")
  const [xColumn, setXColumn] = useState("")
  const [yColumn, setYColumn] = useState("")
  const [filePath, setFilePath] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const labels_data = []  // Store labels data in memory
  const [isUploading, setIsUploading] = useState(false)
  const [fileData, setFileData] = useState<{ path: string } | null>(null)
  const [columns, setColumns] = useState<string[]>([])

  const validateInputs = () => {
    if (!filePath) {
      toast.error("Missing File", {
        description: "Please upload a data file first"
      })
      return false
    }

    if (!xColumn || !yColumn) {
      toast.error("Missing Columns", {
        description: "Please select both X and Y axis columns"
      })
      return false
    }

    if (!VALID_CHART_TYPES.includes(chartType)) {
      toast.error("Invalid Chart Type", {
        description: `Chart type must be one of: ${VALID_CHART_TYPES.join(', ')}`
      })
      return false
    }

    return true
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB')
      return
    }

    try {
      setIsUploading(true)
      
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please log in to upload files')
        return
      }

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

      // Set the file data with the public URL
      const newFileData = { path: publicUrl }
      setFileData(newFileData)
      setFilePath(publicUrl)
      toast.success('File uploaded successfully')
      
      // Fetch columns for later use
      const colResponse = await fetch(`${API_BASE_URL}/preprocess/columns?file_path=${encodeURIComponent(publicUrl)}`)
      if (!colResponse.ok) {
        const errorData = await colResponse.json().catch(() => ({ detail: 'Failed to fetch columns' }))
        console.error(errorData)
        return
      }
      const colData = await colResponse.json()
      setColumns(colData.columns)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  // Add a wrapper function that matches the ColumnSelector's expected prop type
  const handleFileUploadWrapper = (path: string) => {
    setFilePath(path)
    setFileData({ path })
  }

  const handleExportToPPT = async () => {
    if (!validateInputs()) {
      return
    }

    try {
      setIsExporting(true)
      toast.info("Exporting chart to PowerPoint...")

      // First fetch the chart data
      const chartResponse = await fetch(`${API_BASE_URL}/visualize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          file_path: fileData?.path,
          x_col: xColumn,
          y_col: yColumn,
          chart_type: chartType
        })
      })

      if (!chartResponse.ok) {
        const errorData = await chartResponse.json()
        throw new Error(errorData.detail || 'Failed to generate chart data')
      }

      const chartData = await chartResponse.json() as ChartResponse

      if (!chartData || !chartData.chart_data || !Array.isArray(chartData.chart_data)) {
        throw new Error('Invalid chart data received from server')
      }

      if (chartData.chart_data.length === 0) {
        throw new Error('No data points available for the selected columns')
      }

      // Transform the data to ensure proper structure
      const transformedChartData = chartData.chart_data.map((item: ChartDataPoint) => ({
        [xColumn]: item[xColumn] || item['x_col'] || item[yColumn],
        [yColumn]: item[yColumn] || item['y_col'] || item[xColumn]
      }))

      // Format the data according to the backend schema
      const exportData = {
        chart_data: transformedChartData,
        chart_type: chartType,
        x_column: xColumn,
        y_column: yColumn
      }

      // Send chart data to backend for PPT generation
      const response = await fetch(`${API_BASE_URL}/visualize/export-ppt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to export to PowerPoint")
      }

      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a download link for the PPT file
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "chart_presentation.pptx"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("PowerPoint presentation downloaded successfully!")
    } catch (error) {
      console.error("Error exporting to PPT:", error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to export to PowerPoint")
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Visualization</h1>
        <p className="text-muted-foreground">Create charts and visualizations from your data</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chart Configuration</CardTitle>
            <CardDescription>Select columns and chart type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColumnSelector 
              xColumn={xColumn} 
              setXColumn={setXColumn} 
              yColumn={yColumn} 
              setYColumn={setYColumn}
              onFileUpload={handleFileUploadWrapper}
            />
            <ChartSelector chartType={chartType} setChartType={setChartType} />
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleExportToPPT}
              disabled={isExporting || !filePath || !xColumn || !yColumn}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                'Export to PPT'
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chart Preview</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ChartPreview 
              chartType={chartType} 
              xColumn={xColumn} 
              yColumn={yColumn} 
              filePath={filePath}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
