"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartSelector } from "@/components/chart-selector"
import { ColumnSelector } from "@/components/column-selector"
import { ChartPreview } from "@/components/chart-preview"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

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

  const handleFileUpload = (path: string) => {
    if (!path) {
      toast.error("Upload Failed", {
        description: "No file path received"
      })
      return
    }
    setFilePath(path)
    // Reset selections when new file is uploaded
    setXColumn("")
    setYColumn("")
  }

  const handleExportToPPT = async () => {
    if (!validateInputs()) {
      return
    }

    try {
      setIsExporting(true)

      // First fetch the chart data
      console.log('Fetching chart data with:', {
        file_path: filePath,
        x_col: xColumn,
        y_col: yColumn,
        chart_type: chartType
      })

      const chartResponse = await fetch(`${API_BASE_URL}/visualize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          file_path: filePath,
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
      console.log('Received chart data:', chartData)

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

      // Then export to PPT
      console.log('Sending export request with:', exportData)

      const response = await fetch(`${API_BASE_URL}/export-ppt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(exportData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Export error response:', errorData)
        throw new Error(errorData.detail || 'Failed to export chart to PPT')
      }

      const blob = await response.blob()
      if (!blob || blob.size === 0) {
        throw new Error('Received empty PPT file from server')
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'chart_presentation.pptx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success("PowerPoint presentation exported successfully!")
    } catch (error) {
      console.error('Export error:', error)
      let errorMessage = 'Failed to export chart to PPT'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      }
      
      toast.error("Export Failed", {
        description: errorMessage
      })
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
              onFileUpload={handleFileUpload}
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
