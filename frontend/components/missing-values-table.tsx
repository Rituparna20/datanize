"use client";

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { usePreprocessStore } from '@/store/preprocess-store';

interface MissingValuesTableProps {
  filePath: string;
  onComplete?: (outputPath: string) => void;
  onProcessComplete?: (result: any) => void;
}

interface Column {
  name: string;
  missingCount: number;
  totalCount: number;
  missingPercentage: number;
}

export function MissingValuesTable({ filePath, onComplete, onProcessComplete }: MissingValuesTableProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { setMissingValuesResults } = usePreprocessStore();

  useEffect(() => {
    fetchMissingValues();
  }, [filePath]);

  const fetchMissingValues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/preprocess/missing-values?file_path=${filePath}`);
      if (!response.ok) {
        throw new Error('Failed to fetch missing values');
      }
      const data = await response.json();
      setColumns(data.columns);
      
      // Initialize methods for all columns with missing values
      const initialMethods: Record<string, string> = {};
      data.columns.forEach((col: Column) => {
        if (col.missingCount > 0) {
          initialMethods[col.name] = 'drop';
        }
      });
      setMethods(initialMethods);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch missing values data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (columnName: string, value: string) => {
    setMethods(prev => ({
      ...prev,
      [columnName]: value
    }));
  };

  const handleApply = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/preprocess/handle-missing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          methods: methods
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to handle missing values');
      }

      const data = await response.json();
      setMissingValuesResults({
        outputPath: data.output_path,
        rowsBefore: data.rows_before,
        rowsAfter: data.rows_after,
        columns: data.columns
      });
      
      toast({
        title: "Success",
        description: "Missing values handled successfully",
      });
      
      if (onComplete) onComplete(data.output_path);
      if (onProcessComplete) onProcessComplete(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to handle missing values",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column</TableHead>
            <TableHead>Missing Values</TableHead>
            <TableHead>Total Values</TableHead>
            <TableHead>Missing %</TableHead>
            <TableHead>Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((column) => (
            <TableRow key={column.name}>
              <TableCell>{column.name}</TableCell>
              <TableCell>{column.missingCount}</TableCell>
              <TableCell>{column.totalCount}</TableCell>
              <TableCell>{column.missingPercentage.toFixed(2)}%</TableCell>
              <TableCell>
                {column.missingCount > 0 && (
                  <Select
                    value={methods[column.name]}
                    onValueChange={(value) => handleMethodChange(column.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drop">Drop</SelectItem>
                      <SelectItem value="mean">Mean</SelectItem>
                      <SelectItem value="median">Median</SelectItem>
                      <SelectItem value="mode">Mode</SelectItem>
                      <SelectItem value="zero">Zero</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Button onClick={handleApply} disabled={loading}>
          Apply
        </Button>
      </div>
    </div>
  );
}