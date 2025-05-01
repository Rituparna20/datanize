"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FeatureSelectionTable } from "@/components/feature-selection-table";

interface FileData {
  path: string;
}

interface MissingValuesInfo {
  missing_count: number;
  missing_percentage: number;
  data_type: string;
}

interface MissingValuesData {
  total_rows: number;
  columns: Record<string, MissingValuesInfo>;
}

interface CategoricalField {
  name: string;
  data_type: string;
  uniqueValues: string[];
}

export default function PreprocessPage() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [activeTab, setActiveTab] = useState("missing-values");
  const [selectedMissingMethods, setSelectedMissingMethods] = useState<Record<string, string>>({});
  const [missingValuesData, setMissingValuesData] = useState<MissingValuesData | null>(null);
  const [isLoadingMissing, setIsLoadingMissing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categoricalFields, setCategoricalFields] = useState<CategoricalField[]>([]);
  const [selectedFeatureMethod, setSelectedFeatureMethod] = useState("pca");
  const [splitRatio, setSplitRatio] = useState(0.8);
  const [randomState, setRandomState] = useState(42);
  const [targetColumn, setTargetColumn] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);
  const [selectedEncodings, setSelectedEncodings] = useState<Record<string, string>>({});
  const [isLoadingCategorical, setIsLoadingCategorical] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [featureResults, setFeatureResults] = useState<any>(null);
  const [splitResults, setSplitResults] = useState<any>(null);
  const [splitSizes, setSplitSizes] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file, file.name);

      const response = await fetch('http://localhost:8000/preprocess/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || 'Failed to upload file');
      }

      const data = await response.json();
      const filePath = data.file_path.replace(/^backend[/\\]/, '').replace(/\\/g, '/');
      setFileData({ path: filePath });
      toast.success('File uploaded successfully');
      
      // Fetch columns for later use
      const colResponse = await fetch(`http://localhost:8000/preprocess/columns?file_path=${encodeURIComponent(filePath)}`);
      if (!colResponse.ok) {
        const errorData = await colResponse.json().catch(() => ({ detail: 'Failed to fetch columns' }));
        console.error(errorData);
        return;
      }
      const colData = await colResponse.json();
      setColumns(colData.columns);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMissingValuesCheck = async (): Promise<void> => {
    if (!fileData?.path) return;

    try {
      setIsLoadingMissing(true);
      const response = await fetch(`http://localhost:8000/preprocess/missing-values?file_path=${encodeURIComponent(fileData.path)}`, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch missing values data' }));
        throw new Error(errorData.detail || 'Failed to fetch missing values data');
      }

      const data = await response.json();
      setMissingValuesData(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check missing values');
      console.error(error);
    } finally {
      setIsLoadingMissing(false);
    }
  };

  const handleMissingValueMethod = (column: string, method: string): void => {
    setSelectedMissingMethods(prev => ({
      ...prev,
      [column]: method
    }));
  };

  const handleMissingValuesSubmit = async (): Promise<void> => {
    if (!fileData?.path) return;

    try {
      setIsLoadingMissing(true);
      
      // Format the methods as required by the backend
      const methodsArray = Object.entries(selectedMissingMethods).map(([variable, strategy]) => ({
        variable,
        strategy
      }));

      // Create FormData
      const formData = new FormData();
      formData.append('file_path', fileData.path);
      formData.append('methods', JSON.stringify(methodsArray));

      const response = await fetch('http://localhost:8000/preprocess/handle-missing', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to handle missing values' }));
        throw new Error(errorData.detail || 'Failed to handle missing values');
      }

      const data = await response.json();
      const outputPath = data.output_path.replace(/^backend[/\\]/, '').replace(/\\/g, '/');
      setFileData({ path: outputPath });
      toast.success('Missing values handled successfully');
      setActiveTab('encoding');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to handle missing values';
      toast.error(message);
      console.error(error);
    } finally {
      setIsLoadingMissing(false);
    }
  };

  const handleFeatureMethodSelect = (value: string) => {
    setSelectedFeatureMethod(value);
  };

  const fetchCategoricalFields = async () => {
    if (!fileData?.path) return;

    try {
      setIsLoadingCategorical(true);
      const response = await fetch(`http://localhost:8000/preprocess/available-categorical-fields?file_path=${encodeURIComponent(fileData.path)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch categorical fields' }));
        throw new Error(errorData.detail || 'Failed to fetch categorical fields');
      }

      const data = await response.json();
      setCategoricalFields(
        (data || []).map((field: any) => ({
          name: field.name || field.variable,
          uniqueValues: field.uniqueValues || [],
          data_type: field.data_type || "object"
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch categorical fields');
      console.error(error);
    } finally {
      setIsLoadingCategorical(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'encoding' && fileData?.path) {
      fetchCategoricalFields();
    }
  }, [activeTab, fileData?.path]);

  const handleSplitData = async () => {
    if (!fileData?.path || !targetColumn) return;

    try {
      const requestBody = {
        file_path: fileData.path,
        test_size: 1 - splitRatio,
        random_state: randomState,
        target_column: targetColumn
      };

      const response = await fetch('http://localhost:8000/preprocess/split', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to split data' }));
        throw new Error(errorData.detail || 'Failed to split data');
      }

      const data = await response.json();
      setSplitResults(data.files || {});
      setSplitSizes(data.sizes || {});
      toast.success('Data split successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to split data';
      toast.error(message);
      console.error(error);
    }
  };

  const handleDownloadSplit = async () => {
    if (!splitResults) return;
    try {
      const response = await fetch('http://localhost:8000/preprocess/download-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: splitResults }),
      });
      if (!response.ok) throw new Error("Failed to download split files");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "train_test_split.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Download failed");
    }
  };

  const handleEncoding = async () => {
    if (!fileData?.path || Object.keys(selectedEncodings).length === 0) return;

    try {
      setIsLoadingCategorical(true);
      const formData = new FormData();
      formData.append('file_path', fileData.path);
      formData.append('fields', JSON.stringify(selectedEncodings));

      const response = await fetch('http://localhost:8000/preprocess/encode-labels', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to encode fields' }));
        throw new Error(errorData.detail || 'Failed to encode fields');
      }

      const data = await response.json();
      setFileData({ path: data.encoded_file_path.replace(/^backend[/\\]/, '').replace(/\\/g, '/') });
      toast.success('Fields encoded successfully');
      setActiveTab('feature-selection');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to encode fields';
      toast.error(message);
      console.error(error);
    } finally {
      setIsLoadingCategorical(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload CSV File'}
        </label>
        {fileData?.path && (
          <p className="mt-2 text-sm text-gray-500">
            File uploaded: {fileData.path.split('/').pop()}
          </p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="missing-values">Missing Values</TabsTrigger>
          <TabsTrigger value="encoding">Encoding</TabsTrigger>
          <TabsTrigger value="feature-selection">Feature Selection</TabsTrigger>
          <TabsTrigger value="data-split">Data Split</TabsTrigger>
        </TabsList>

        <TabsContent value="missing-values" className="space-y-4">
          <div className="flex flex-col gap-4">
            <Button 
              onClick={handleMissingValuesCheck}
              disabled={!fileData?.path || isLoadingMissing}
            >
              {isLoadingMissing ? 'Checking...' : 'Check Missing Values'}
            </Button>

            {missingValuesData && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Total rows: {missingValuesData.total_rows}
                </div>
                
                {Object.entries(missingValuesData.columns).length > 0 ? (
                  <>
                    <div className="grid gap-4">
                      {Object.entries(missingValuesData.columns).map(([column, info], index) => (
                        <div key={`missing-${column}-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">{column}</div>
                            <div className="text-sm text-muted-foreground">
                              Missing: {info.missing_count} ({info.missing_percentage.toFixed(2)}%)
                            </div>
                          </div>
                          <Select
                            value={selectedMissingMethods[column] || ''}
                            onValueChange={(value) => handleMissingValueMethod(column, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Drop rows">Drop rows</SelectItem>
                              <SelectItem value="Replace with mean">Replace with mean</SelectItem>
                              <SelectItem value="Replace with median">Replace with median</SelectItem>
                              <SelectItem value="Replace with mode">Replace with mode</SelectItem>
                              <SelectItem value="Replace with zero">Replace with zero</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={handleMissingValuesSubmit}
                      disabled={Object.keys(selectedMissingMethods).length === 0 || isLoadingMissing}
                    >
                      {isLoadingMissing ? 'Processing...' : 'Process Missing Values'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center p-4 border rounded-lg">
                    No missing values found in the dataset
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="encoding" className="space-y-4">
          <div className="flex flex-col gap-4">
            {isLoadingCategorical ? (
              <div className="text-center py-4">Loading categorical fields...</div>
            ) : categoricalFields.length > 0 ? (
              <>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Select Categorical Variables to Encode</h3>
                  <div className="flex flex-wrap gap-4">
                    {categoricalFields.map((field, index) => (
                      <label key={`cat-field-${field.name || index}`} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.has(field.name)}
                          onChange={(e) => {
                            const fieldName = field.name;
                            const newSelected = new Set(selectedFields);
                            if (e.target.checked) {
                              newSelected.add(fieldName);
                            } else {
                              newSelected.delete(fieldName);
                              const newEncodings = { ...selectedEncodings };
                              delete newEncodings[fieldName];
                              setSelectedEncodings(newEncodings);
                            }
                            setSelectedFields(newSelected);
                          }}
                          className="h-4 w-4"
                        />
                        <span>{field.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedFields.size > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Selected Fields</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Field Name</th>
                            <th className="px-4 py-2 text-left">Unique Values</th>
                            <th className="px-4 py-2 text-left">Handle Strategy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoricalFields
                            .filter(field => selectedFields.has(field.name))
                            .map((field, index) => (
                              <tr key={`selected-field-${field.name || index}`} className="border-t">
                                <td className="px-4 py-2">{field.name}</td>
                                <td className="px-4 py-2">{(field.uniqueValues || []).join(', ') || 'None'}</td>
                                <td className="px-4 py-2">
                                  <Select
                                    value={selectedEncodings[field.name] || ''}
                                    onValueChange={(value) => setSelectedEncodings(prev => ({
                                      ...prev,
                                      [field.name]: value
                                    }))}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue placeholder="Select encoding" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Label Encoding">Label Encoding</SelectItem>
                                      <SelectItem value="One-Hot Encoding">One-Hot Encoding</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <Button 
                      onClick={handleEncoding}
                      disabled={Object.keys(selectedEncodings).length === 0}
                      className="mt-4"
                    >
                      Apply Encoding
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-4 border rounded-lg">
                No categorical fields found in the dataset
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="feature-selection">
          {fileData?.path ? (
            <FeatureSelectionTable
              featureMethod={selectedFeatureMethod}
              onMethodChange={handleFeatureMethodSelect}
              results={featureResults || { featureScores: [] }}
              filePath={fileData.path}
              onResults={setFeatureResults}
            />
          ) : (
            <div>Please upload a file first</div>
          )}
        </TabsContent>

        <TabsContent value="data-split" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Column</Label>
              <Select value={targetColumn} onValueChange={setTargetColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col, index) => (
                    <SelectItem key={`col-${index}-${col}`} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Split Ratio (Train)</Label>
              <Slider
                value={[splitRatio]}
                onValueChange={([value]) => setSplitRatio(value)}
                min={0.5}
                max={0.9}
                step={0.1}
              />
              <p className="text-sm text-gray-500">{(splitRatio * 100).toFixed(0)}% Train / {((1 - splitRatio) * 100).toFixed(0)}% Test</p>
            </div>

            <div className="space-y-2">
              <Label>Random State</Label>
              <Slider
                value={[randomState]}
                onValueChange={([value]) => setRandomState(value)}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-sm text-gray-500">Value: {randomState}</p>
            </div>

            <Button onClick={handleSplitData}>Split Data</Button>

            {splitSizes && (
              <div className="mt-4 p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Split Sizes:</h3>
                <ul className="space-y-1">
                  {Object.entries(splitSizes).map(([key, size]) => (
                    <li key={key} className="text-sm text-gray-600">
                      {key}: {String(size)} rows
                    </li>
                  ))}
                </ul>
                <Button className="mt-4" onClick={handleDownloadSplit}>
                  Download Train-Test Data
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
