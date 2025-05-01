"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, Database, FileText, ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function DashboardNav() {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: FileText,
    },
    {
      title: "Preprocess",
      href: "/dashboard/preprocess",
      icon: Database,
    },
    {
      title: "Visualize",
      href: "/dashboard/visualize",
      icon: BarChart2,
    },
    {
      title: "Image Labeling",
      href: "/dashboard/image-labeling",
      icon: ImageIcon,
    },
  ]

  return (
    <nav className="w-64 border-r border-lightgrey bg-verylightblue p-4">
      <div className="space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant={pathname === item.href ? "default" : "ghost"}
            className={cn(
              "w-full justify-start text-charcoal hover:bg-softindigo hover:text-white",
              pathname === item.href ? "bg-softindigo text-white" : "text-charcoal"
            )}
            asChild
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  )
}
