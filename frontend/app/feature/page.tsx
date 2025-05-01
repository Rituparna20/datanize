"use client"

import { useState, useEffect } from "react"
import { FeatureSelectionTable } from "@/components/feature-selection-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FeaturePage() {
  const [filePath, setFilePath] = useState<string>("")
  const [method, setMethod] = useState<string>("pca")
  const [results, setResults] = useState<any>(null)

  // Try to get the file path from localStorage on component mount
  useEffect(() => {
    const savedFilePath = localStorage.getItem("uploadedFilePath")
    if (savedFilePath) {
      setFilePath(savedFilePath)
    }
  }, [])

  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feature Selection</h1>
        <p className="text-muted-foreground">Apply different feature selection techniques to your dataset</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current File</CardTitle>
          <CardDescription>Using file: {filePath || "No file selected"}</CardDescription>
        </CardHeader>
      </Card>

      {filePath ? (
        <Card>
          <CardContent>
            <FeatureSelectionTable
              featureMethod={method}
              onMethodChange={handleMethodChange}
              results={results || { featureScores: [] }}
              filePath={filePath}
              onResults={setResults}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <p className="text-muted-foreground">Please upload a file first to perform feature selection.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
