"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import Papa from "papaparse"
import {
  Bar, BarChart as RechartsBarChart,
  Line, LineChart as RechartsLineChart,
  Pie, PieChart as RechartsPieChart,
  Scatter, ScatterChart as RechartsScatterChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Cell, ResponsiveContainer, Scatter as RechartsScatter
} from "recharts"

interface ChartPreviewProps {
  chartType: string
  xColumn: string
  yColumn: string
  filePath?: string
}

export function ChartPreview({ chartType, xColumn, yColumn, filePath }: ChartPreviewProps) {
  const [chartData, setChartData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!filePath || !xColumn || !yColumn) {
      setError("Please select both X and Y axis columns")
      return
    }

    fetchChartData()
  }, [chartType, xColumn, yColumn, filePath])

  const fetchChartData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8000/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          x_col: xColumn,
          y_col: yColumn,
          chart_type: chartType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to generate chart')
      }

      const data = await response.json()
      if (!data.chart_data) {
        throw new Error('No chart data received')
      }

      setChartData(data.chart_data)
    } catch (error) {
      console.error('Chart generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate chart'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Generating chart...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <p>{error}</p>
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select columns and chart type to preview</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === "bar" ? (
        <RechartsBarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xColumn} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={yColumn} fill="#8884d8" />
        </RechartsBarChart>
      ) : chartType === "line" ? (
        <RechartsLineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xColumn} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yColumn} stroke="#8884d8" />
        </RechartsLineChart>
      ) : chartType === "pie" ? (
        <RechartsPieChart>
          <Pie
            data={chartData}
            dataKey={yColumn}
            nameKey={xColumn}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RechartsPieChart>
      ) : (
        <RechartsScatterChart>
          <CartesianGrid />
          <XAxis type="number" dataKey={xColumn} name={xColumn} />
          <YAxis type="number" dataKey={yColumn} name={yColumn} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend />
          <RechartsScatter name="Data Points" data={chartData} fill="#8884d8" />
        </RechartsScatterChart>
      )}
    </ResponsiveContainer>
  )
}
