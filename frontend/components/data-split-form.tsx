"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";

interface DataSplitFormProps {
  filePath: string;
  columns: string[];
  onSplitComplete?: (files: {
    X_train: string;
    X_test: string;
    y_train: string;
    y_test: string;
  }) => void;
}

export function DataSplitForm({ filePath, columns, onSplitComplete }: DataSplitFormProps) {
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [testSize, setTestSize] = useState<number>(30); // 30% test size
  const [randomState, setRandomState] = useState<number>(42);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitResults, setSplitResults] = useState<any>(null);

  const handleSplit = async () => {
    if (!filePath) {
      toast.error("Missing File", {
        description: "Please upload a file first"
      });
      return;
    }

    if (!targetColumn) {
      toast.error("Missing Target", {
        description: "Please select a target column"
      });
      return;
    }

    // Clean up file path - remove any duplicate 'uploads' folders
    const cleanFilePath = filePath.replace(/uploads\/uploads/, 'uploads');

    setIsProcessing(true);
    try {
      const response = await fetch(`https://software-datanize.onrender.com/preprocess/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: cleanFilePath,
          test_size: testSize / 100, // Convert percentage to decimal
          random_state: randomState,
          target_column: targetColumn
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to split data');
      }

      const result = await response.json();
      setSplitResults(result);
      
      if (onSplitComplete) {
        onSplitComplete(result.files);
      }
      
      toast.success("Data Split Complete", {
        description: "Your data has been successfully split into train and test sets"
      });
    } catch (error) {
      console.error('Split error:', error);
      toast.error("Split Failed", {
        description: error instanceof Error ? error.message : "Failed to split data"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (filePath: string) => {
    try {
      // Clean up file path - remove any duplicate 'uploads' folders
      const cleanPath = filePath.replace(/uploads[\/\\]uploads/, 'uploads');
      
      const backendUrl = 'https://software-datanize.onrender.com';
      const downloadUrl = `${backendUrl}/preprocess/download?file_path=${encodeURIComponent(cleanPath)}`;
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Download failed with status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const filename = cleanPath.split(/[\/\\]/).pop() || 'download.csv';
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success("Download Complete", {
        description: `Successfully downloaded ${filename}`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Download Failed", {
        description: error instanceof Error ? error.message : "Failed to download file"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Train-Test Split</CardTitle>
          <CardDescription>Configure how to split your dataset into training and testing sets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Target Column</Label>
            <Select value={targetColumn} onValueChange={setTargetColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select target column" />
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
            <Label>Test Set Size: {testSize}%</Label>
            <Slider
              value={[testSize]}
              onValueChange={(value) => setTestSize(value[0])}
              min={10}
              max={40}
              step={10}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Training Set: {100 - testSize}% | Test Set: {testSize}%
            </p>
          </div>

          <div className="space-y-2">
            <Label>Random State: {randomState}</Label>
            <Slider
              value={[randomState]}
              onValueChange={(value) => setRandomState(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <Button
            onClick={handleSplit}
            disabled={isProcessing || !targetColumn}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Split Data"
            )}
          </Button>
        </CardContent>
      </Card>

      {splitResults && (
        <Card>
          <CardHeader>
            <CardTitle>Split Results</CardTitle>
            <CardDescription>Download the split datasets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(splitResults.files).map(([key, path]) => (
                <Button
                  key={key}
                  onClick={() => handleDownload(path as string)}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download {key}
                </Button>
              ))}
            </div>
            {splitResults.shapes && (
              <div className="text-sm text-muted-foreground">
                <p>Dataset Shapes:</p>
                {Object.entries(splitResults.shapes).map(([key, shape]) => (
                  <p key={key}>
                    {key}: {JSON.stringify(shape)}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
