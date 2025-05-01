import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

interface FeatureScore {
  feature: string
  score: number
}

interface FeatureScoresTableProps {
  featureScores: Array<{ feature: string; score: number }>
  method: string
  additionalInfo?: {
    explained_variance?: number
    r2_score?: number
  }
}

export function FeatureScoresTable({
  featureScores,
  method,
  additionalInfo,
}: FeatureScoresTableProps) {
  // Sort features by absolute score in descending order
  const sortedScores = [...featureScores].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))

  return (
    <div className="space-y-4">
      {additionalInfo && (
        <div className="text-sm text-muted-foreground">
          {method === "pca" && additionalInfo.explained_variance && (
            <p>Explained Variance: {(additionalInfo.explained_variance * 100).toFixed(2)}%</p>
          )}
          {method === "rfe" && additionalInfo.r2_score && (
            <p>R² Score: {additionalInfo.r2_score.toFixed(4)}</p>
          )}
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            <TableHead className="text-right">
              {method === "correlation" && "Correlation Score"}
              {method === "pca" && "Component Loading"}
              {method === "rfe" && "VIP Score"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedScores.map(({ feature, score }) => (
            <TableRow key={feature}>
              <TableCell>{feature}</TableCell>
              <TableCell className="text-right">{score.toFixed(4)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 