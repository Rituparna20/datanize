"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { handleMissingValues, encodeLabels, splitData, selectFeatures } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MissingValuesTable } from "@/components/missing-values-table"
import { EncodingForm } from "@/components/encoding-form"
import { FeatureSelectionTable } from "@/components/feature-selection-table"
import { DataSplitForm } from "@/components/data-split-form"

export default function PreprocessPage() {
  const [filePath, setFilePath] = useState<string>("")
  const [missingMethod, setMissingMethod] = useState<string>("mean")
  const [featureMethod, setFeatureMethod] = useState<string>("pca")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [missingValueResults, setMissingValueResults] = useState<any>(null)
  const [encodingResults, setEncodingResults] = useState<any>(null)
  const [splitResults, setSplitResults] = useState<any>(null)
  const [featureResults, setFeatureResults] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>("missing")
  const [columns, setColumns] = useState<string[]>([])
  const [processedFilePath, setProcessedFilePath] = useState<string>("")
  const { toast } = useToast()

  // Try to get the file path from localStorage on component mount
  useEffect(() => {
    const savedFilePath = localStorage.getItem("uploadedFilePath")
    if (savedFilePath) {
      setFilePath(savedFilePath)
      setProcessedFilePath(savedFilePath)
    }
  }, [])

  const handleFilePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilePath(e.target.value)
  }

  const handleMissingValueProcess = async () => {
    if (!filePath) {
      toast({
        title: "Error",
        description: "Please enter a file path",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result = await handleMissingValues(filePath, missingMethod)
      setMissingValueResults(result)
      setProcessedFilePath(result.output_path)
      toast({
        title: "Success",
        description: "Missing values handled successfully",
      })
      // Automatically move to encoding tab
      setActiveTab("encoding")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to handle missing values",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEncodingComplete = (results: any) => {
    setEncodingResults(results)
    setProcessedFilePath(results.encoded_file_path)
    // Automatically move to feature selection tab
    setActiveTab("features")
  }

  const handleSplitComplete = (files: {
    X_train: string;
    X_test: string;
    y_train: string;
    y_test: string;
  }) => {
    setSplitResults(files)
    toast({
      title: "Success",
      description: "Data split successfully",
    })
  }

  const handleFeatureSelection = async () => {
    if (!filePath) {
      toast({
        title: "Error",
        description: "Please upload a file first",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      console.log("Starting feature selection with method:", featureMethod)
      const result = await selectFeatures(featureMethod, filePath)
      console.log("Feature selection result:", result)
      
      if (!result?.featureScores) {
        throw new Error("Invalid feature selection response format")
      }
      
      setFeatureResults(result)
      toast({
        title: "Success",
        description: `Successfully calculated feature importance using ${featureMethod}`,
      })
    } catch (error) {
      console.error("Feature selection error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to perform feature selection",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProcessClick = async () => {
    switch (activeTab) {
      case "missing":
        await handleMissingValueProcess()
        break
      case "encoding":
        await handleEncodingComplete(encodingResults)
        break
      case "features":
        await handleFeatureSelection()
        break
      case "split":
        // Handle split logic
        break
      default:
        break
    }
  }

  console.log("[DEBUG] PreprocessPage rendered, activeTab:", activeTab, "processedFilePath:", processedFilePath, "filePath:", filePath);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Preprocessing</h1>
        <p className="text-muted-foreground">
          Handle missing values, encode categorical variables, and select important features
        </p>
      </div>

      <Tabs value={activeTab} className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="missing">Missing Values</TabsTrigger>
          <TabsTrigger value="encoding">Encoding</TabsTrigger>
          <TabsTrigger value="features">Feature Selection</TabsTrigger>
          <TabsTrigger value="split">Data Split</TabsTrigger>
        </TabsList>
        
        <TabsContent value="missing">
          <MissingValuesTable 
            filePath={filePath} 
            onProcessComplete={(result: any) => {
              setMissingValueResults(result)
              setProcessedFilePath(result.output_path)
              setActiveTab("encoding")
            }}
          />
        </TabsContent>
        
        <TabsContent value="encoding">
          <EncodingForm 
            key={processedFilePath || filePath}
            filePath={processedFilePath || filePath}
            onEncodingComplete={handleEncodingComplete}
          />
        </TabsContent>
        
        <TabsContent value="features">
          <FeatureSelectionTable
            featureMethod={featureMethod}
            onMethodChange={setFeatureMethod}
            results={featureResults || { featureScores: [] }}
            filePath={processedFilePath || filePath}
            onResults={setFeatureResults}
          />
        </TabsContent>

        <TabsContent value="split">
          <DataSplitForm 
            filePath={processedFilePath || filePath}
            columns={columns}
            onSplitComplete={handleSplitComplete}
          />
        </TabsContent>
      </Tabs>

      <Button
        onClick={handleProcessClick}
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Process Data"
        )}
      </Button>
    </div>
  )
}
