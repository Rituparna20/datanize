"use client"

import { BarChart, LineChart, PieChart, ScatterChartIcon as ScatterPlot } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface ChartSelectorProps {
  chartType: string
  setChartType: (value: string) => void
}

export function ChartSelector({ chartType, setChartType }: ChartSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Chart Type</Label>
      <RadioGroup value={chartType} onValueChange={setChartType} className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-2 rounded-md border p-4 [&:has([data-state=checked])]:bg-muted">
          <RadioGroupItem value="bar" id="bar" className="sr-only" />
          <Label htmlFor="bar" className="cursor-pointer flex flex-col items-center gap-1">
            <BarChart className="h-8 w-8" />
            <span>Bar Chart</span>
          </Label>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-md border p-4 [&:has([data-state=checked])]:bg-muted">
          <RadioGroupItem value="line" id="line" className="sr-only" />
          <Label htmlFor="line" className="cursor-pointer flex flex-col items-center gap-1">
            <LineChart className="h-8 w-8" />
            <span>Line Chart</span>
          </Label>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-md border p-4 [&:has([data-state=checked])]:bg-muted">
          <RadioGroupItem value="pie" id="pie" className="sr-only" />
          <Label htmlFor="pie" className="cursor-pointer flex flex-col items-center gap-1">
            <PieChart className="h-8 w-8" />
            <span>Pie Chart</span>
          </Label>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-md border p-4 [&:has([data-state=checked])]:bg-muted">
          <RadioGroupItem value="scatter" id="scatter" className="sr-only" />
          <Label htmlFor="scatter" className="cursor-pointer flex flex-col items-center gap-1">
            <ScatterPlot className="h-8 w-8" />
            <span>Scatter Plot</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  )
}
