"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/file-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Database, BarChart2, ImageIcon, FileText, MoreVertical } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
      } else {
        setIsAuthenticated(true)
      }
    }
    checkAuth()
  }, [router])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Your Dashboard</h1>
          <p className="text-gray-600">Manage and analyze your data efficiently</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks at your fingertips</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Link href="/dashboard/preprocess">
                <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                  <Database className="h-6 w-6" />
                  <span>Preprocess Data</span>
                </Button>
              </Link>
              <Link href="/dashboard/visualize">
                <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                  <BarChart2 className="h-6 w-6" />
                  <span>Visualize Data</span>
                </Button>
              </Link>
              <Link href="/dashboard/image-labeling">
                <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="h-6 w-6" />
                  <span>Image Labeling</span>
                </Button>
              </Link>
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                <FileText className="h-6 w-6" />
                <span>Upload New File</span>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="font-medium">New data file uploaded</p>
                    <p className="text-sm text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="font-medium">Data preprocessing completed</p>
                    <p className="text-sm text-gray-500">Yesterday</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-2 w-2 rounded-full bg-purple-500 mt-2" />
                  <div>
                    <p className="font-medium">New visualization created</p>
                    <p className="text-sm text-gray-500">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Data Overview</CardTitle>
              <CardDescription>Summary of your data assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-gray-500">Total Files</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">4.2 GB</p>
                  <p className="text-sm text-gray-500">Storage Used</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-sm text-gray-500">Active Projects</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-sm text-gray-500">Visualizations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Files Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Files</CardTitle>
              <CardDescription>Your most recently accessed files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">sales_data_2023.csv</p>
                      <p className="text-sm text-gray-500">Last modified: 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">customer_analysis.xlsx</p>
                      <p className="text-sm text-gray-500">Last modified: Yesterday</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">product_inventory.csv</p>
                      <p className="text-sm text-gray-500">Last modified: 2 days ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
