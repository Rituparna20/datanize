import { FeatureScoresTable } from "@/components/feature-scores-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface FeatureSelectionTableProps {
  featureMethod: string
  onMethodChange: (value: string) => void
  results: {
    featureScores: Array<{ feature: string; score: number }>
    additionalInfo?: {
      explained_variance?: number
      r2_score?: number
    }
  }
  filePath?: string
  onResults?: (results: any) => void
}

export function FeatureSelectionTable({
  featureMethod,
  onMethodChange,
  results,
  filePath,
  onResults,
}: FeatureSelectionTableProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleProcess = async () => {
    if (!filePath) {
      toast.error("No file selected", {
        description: "Please upload a file before performing feature selection"
      })
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/feature/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: featureMethod,
          file_path: filePath
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      onMethodChange(featureMethod)
      if (typeof onResults === 'function') {
        onResults(result)
      }
      
      toast.success("Feature Selection Completed", {
        description: `Successfully performed ${featureMethod.toUpperCase()} feature selection`
      })
      
    } catch (error) {
      console.error('Feature selection error:', error)
      toast.error("Feature Selection Failed", {
        description: error instanceof Error ? error.message : "Failed to process feature selection"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/feature/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: featureMethod, file_path: filePath }),
      })
      if (!response.ok) throw new Error("Failed to download file")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = "feature_selection_result.xlsx"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert("Download failed")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Selection Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={featureMethod}
          onValueChange={onMethodChange}
          className="grid grid-cols-3 gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="correlation" id="correlation" />
            <Label htmlFor="correlation">Correlation</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pca" id="pca" />
            <Label htmlFor="pca">PCA</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="rfe" id="rfe" />
            <Label htmlFor="rfe">RFE</Label>
          </div>
        </RadioGroup>

        <Button
          onClick={handleProcess}
          disabled={isProcessing || !filePath}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Process Feature Selection"
          )}
        </Button>

        {results && (
          <FeatureScoresTable
            featureScores={results.featureScores}
            method={featureMethod}
            additionalInfo={results.additionalInfo}
          />
        )}

        <Button
          onClick={handleDownload}
          disabled={downloading || !filePath}
          className="w-full"
        >
          {downloading ? (
            "Downloading..."
          ) : (
            "Download as Excel"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}