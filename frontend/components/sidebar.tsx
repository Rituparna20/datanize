"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, BarChart3, Layers, ImageIcon, Home } from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()

  const routes = [
    {
      name: "Dashboard",
      path: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: "Upload",
      path: "/upload",
      icon: <FileSpreadsheet className="h-5 w-5" />,
    },
    {
      name: "Preprocess",
      path: "/preprocess",
      icon: <Layers className="h-5 w-5" />,
    },
    {
      name: "Feature Selection",
      path: "/feature",
      icon: <Layers className="h-5 w-5" />,
    },
    {
      name: "Visualization",
      path: "/visualize",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      name: "Image Labeling",
      path: "/image",
      icon: <ImageIcon className="h-5 w-5" />,
    },
  ]

  return (
    <div className="hidden border-r border-lightgrey bg-verylightblue lg:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b border-lightgrey px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-charcoal">
            <img src="/images/logo.png" alt="Datanize Logo" className="h-8 w-auto" />
            <span className="sr-only">Datanize</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {routes.map((route) => (
              <Button
                key={route.path}
                asChild
                variant={pathname === route.path ? "default" : "ghost"}
                className={cn(
                  "justify-start text-charcoal hover:bg-softindigo hover:text-white",
                  pathname === route.path ? "bg-softindigo text-white" : "text-charcoal"
                )}
              >
                <Link href={route.path} className="flex items-center gap-3 px-3">
                  {route.icon}
                  {route.name}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
