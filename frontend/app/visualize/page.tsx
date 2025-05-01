"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Download } from "lucide-react"
import { ChartPreview } from "@/components/chart-preview"
import { ColumnSelector } from "@/components/column-selector"
import { ChartSelector } from "@/components/chart-selector"

export default function VisualizePage() {
  const [filePath, setFilePath] = useState<string>("")
  const [xCol, setXCol] = useState<string>("")
  const [yCol, setYCol] = useState<string>("")
  const [chartType, setChartType] = useState<string>("bar")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const savedPath = localStorage.getItem("uploadedFilePath")
    if (savedPath) setFilePath(savedPath)
  }, [])

  const handleGenerateChart = async () => {
    if (!filePath || !xCol || !yCol || !chartType) {
      toast({
        title: "Missing Fields",
        description: "Please select all chart options before generating.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("http://localhost:8000/visualize/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: filePath,
          x_col: xCol,
          y_col: yCol,
          chart_type: chartType,
        }),
      })

      const data = await res.json()
      if (data.pdf_path) {
        setPdfPath(data.pdf_path)
        toast({
          title: "Success",
          description: "Chart generated successfully!",
        })
      } else {
        throw new Error("Chart generation failed")
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Chart generation failed.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportToPPT = async () => {
    if (!pdfPath) {
      toast({
        title: "Error",
        description: "Please generate a chart first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:8000/visualize/export-ppt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chart_data: pdfPath,
          chart_type: chartType,
          x_column: xCol,
          y_column: yCol,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate PPT")
      }

      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "chart_presentation.pptx"
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "PowerPoint presentation downloaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PowerPoint presentation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Visualization</h1>
        <p className="text-muted-foreground">Create and export charts from your uploaded dataset</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chart Configuration</CardTitle>
          <CardDescription>Select chart type and column mappings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ColumnSelector xColumn={xCol} setXColumn={setXCol} yColumn={yCol} setYColumn={setYCol} />
          <ChartSelector chartType={chartType} setChartType={setChartType} />

          <Button onClick={handleGenerateChart} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Chart...
              </>
            ) : (
              "Generate and Export"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartPreview chartType={chartType} xColumn={xCol} yColumn={yCol} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart Export</CardTitle>
          <CardDescription>Download the chart as a PDF after generation</CardDescription>
        </CardHeader>
        <CardContent>
          {pdfPath ? (
            <a href={`http://localhost:8000${pdfPath}`} target="_blank" rel="noopener noreferrer">
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download Chart as PDF
              </Button>
            </a>
          ) : (
            <p className="text-muted-foreground">No chart generated yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export to PowerPoint</CardTitle>
          <CardDescription>Download the chart as a PowerPoint presentation</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={handleExportToPPT}
            disabled={isLoading || !pdfPath}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PPT...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export to PPT
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
