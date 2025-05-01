"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { encodeLabels } from "@/lib/api";

interface CategoricalField {
  variable: string;
  uniqueValues: string[];
  strategy: string;
}

export function EncodingTable() {
  const [availableFields, setAvailableFields] = useState<CategoricalField[]>([]);
  const [selectedFields, setSelectedFields] = useState<CategoricalField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategoricalFields = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:8000/preprocess/available-categorical-fields");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setAvailableFields(result.map((field: any) => ({
          ...field,
          strategy: "Label Encoding" // Default strategy
        })));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setAvailableFields([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoricalFields();
  }, []);

  const handleAddField = (field: CategoricalField) => {
    if (!selectedFields.some(f => f.variable === field.variable)) {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleRemoveField = (variable: string) => {
    setSelectedFields(selectedFields.filter(f => f.variable !== variable));
  };

  const handleStrategyChange = (variable: string, strategy: string) => {
    setSelectedFields(selectedFields.map(field => 
      field.variable === variable ? { ...field, strategy } : field
    ));
  };

  const handleProcess = async () => {
    try {
      const filePath = localStorage.getItem('uploadedFilePath');
      if (!filePath) {
        throw new Error('No file path found');
      }

      // Create a map of field names to their strategies
      const fieldsToEncode = selectedFields.reduce((acc, field) => {
        acc[field.variable] = field.strategy;
        return acc;
      }, {} as Record<string, string>);

      const response = await fetch("http://localhost:8000/preprocess/encode", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          fields: fieldsToEncode
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      
      toast({
        title: "Success",
        description: "Encoding fields are handled successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process encoding",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading categorical fields...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Available Fields Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Available Categorical Fields</h3>
        <div className="flex flex-wrap gap-2">
          {availableFields.map((field) => (
            <Button
              key={field.variable}
              variant="outline"
              onClick={() => handleAddField(field)}
              disabled={selectedFields.some(f => f.variable === field.variable)}
            >
              {field.variable}
            </Button>
          ))}
        </div>
      </div>

      {/* Selected Fields Table */}
      {selectedFields.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Selected Fields for Encoding</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variable</TableHead>
                  <TableHead>Unique Values</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedFields.map((field) => (
                  <TableRow key={field.variable}>
                    <TableCell>{field.variable}</TableCell>
                    <TableCell>
                      <div className="max-h-20 overflow-y-auto">
                        {field.uniqueValues.join(", ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={field.strategy}
                        onValueChange={(val) => handleStrategyChange(field.variable, val)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Label Encoding">Label Encoding</SelectItem>
                          <SelectItem value="One-Hot Encoding">One-Hot Encoding</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => handleRemoveField(field.variable)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleProcess}>
              Preprocess
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 