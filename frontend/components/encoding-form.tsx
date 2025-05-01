"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CategoricalField {
  variable: string;
  uniqueValues: string[];
  encoding: string;
}

interface EncodingFormProps {
  filePath: string;
  onEncodingComplete: (results: any) => void;
}

export function EncodingForm({ filePath, onEncodingComplete }: EncodingFormProps) {
  console.log("[DEBUG] EncodingForm mounted with filePath:", filePath);
  const [categoricalFields, setCategoricalFields] = useState<CategoricalField[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [encodingMethods, setEncodingMethods] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (filePath) {
      fetchCategoricalFields();
    }
  }, [filePath]);

  const fetchCategoricalFields = async () => {
    console.log('[DEBUG] fetchCategoricalFields called with filePath:', filePath);
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/preprocess/available-categorical-fields?file_path=${filePath}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch categorical fields");
      }

      const data = await response.json();
      console.log("[DEBUG] Received categorical fields from backend:", data);
      setCategoricalFields(data);
    } catch (error) {
      toast.error("Failed to fetch categorical fields: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSelection = (variable: string) => {
    setSelectedFields(prev => {
      if (prev.includes(variable)) {
        return prev.filter(field => field !== variable);
      } else {
        return [...prev, variable];
      }
    });
  };

  const handleEncodingMethodChange = (variable: string, value: string) => {
    setEncodingMethods(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  const handleProcessEncoding = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to encode");
      return;
    }

    const fieldsToEncode = selectedFields.reduce((acc, field) => {
      acc[field] = encodingMethods[field] || "Label Encoding"; // default to label encoding if not specified
      return acc;
    }, {} as Record<string, string>);

    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append("file_path", filePath);
      formData.append("fields", JSON.stringify(fieldsToEncode));

      const response = await fetch("http://localhost:8000/preprocess/encode-labels", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      onEncodingComplete(data);
      toast.success("Encoding for the specified columns is done successfully");
    } catch (error) {
      toast.error("Failed to process encoding: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderUniqueValues = (values: string[]) => {
    if (!values || values.length === 0) return "No values";
    
    const displayValues = values.slice(0, 5);
    const remaining = values.length - 5;
    
    return (
      <div className="flex flex-wrap gap-1">
        {displayValues.map((value, index) => (
          <Badge key={index} variant="secondary">{value}</Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="outline">+{remaining} more</Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading categorical fields...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categoricalFields.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No categorical fields found in the dataset
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Unique Values</TableHead>
                <TableHead>Encoding Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoricalFields.map((field) => (
                <TableRow key={field.variable}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFields.includes(field.variable)}
                      onCheckedChange={() => handleFieldSelection(field.variable)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{field.variable}</TableCell>
                  <TableCell>{renderUniqueValues(field.uniqueValues)}</TableCell>
                  <TableCell>
                    <Select
                      value={encodingMethods[field.variable] || "Label Encoding"}
                      onValueChange={(value) => handleEncodingMethodChange(field.variable, value)}
                      disabled={!selectedFields.includes(field.variable)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select encoding" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Label Encoding">Label Encoding</SelectItem>
                        <SelectItem value="One-Hot Encoding">One-Hot Encoding</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button
            onClick={handleProcessEncoding}
            disabled={selectedFields.length === 0 || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Encoding...
              </>
            ) : (
              "Process Encoding Variables"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
