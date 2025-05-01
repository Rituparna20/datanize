"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function HomeContent() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="w-full flex flex-col items-center py-8 bg-transparent absolute top-0 left-0 z-10">
        <img src="/images/logo.png" alt="Datanize Logo" className="h-16 w-auto mb-2" />
        <span className="text-6xl font-extrabold bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent drop-shadow-lg tracking-wide">
          Datanize
        </span>
      </header>

      {/* Hero Section */}
      <section className="flex items-center justify-center min-h-[80vh] bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Automate Your Data Preprocessing and Visualization</h1>
          <p className="text-xl mb-8">Handle structured and unstructured data seamlessly. Clean, transform, and visualize your insights effortlessly with Datanize.</p>
          <div className="space-x-4">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100 border border-gray-300"
              >
                Sign-up/Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Datanize Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Why Datanize?</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg mb-4">Data today is messy and overwhelming. Cleaning and preparing it manually takes hours, drains productivity, and delays insights.</p>
              <p className="text-lg">Datanize automates the boring parts — so you can focus on what matters: making better, faster decisions.</p>
            </div>
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>🥴 Before Datanize</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Manual data cleaning, inconsistent formats, endless Excel headaches, and slow reporting.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>😎 After Datanize</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Automated preprocessing, clean structured outputs, faster visualizations, quick insights.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Features You'll Love</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                emoji: "🛠",
                title: "Automated Preprocessing",
                description: "Automatically clean, transform, and structure your raw data — no coding needed."
              },
              {
                emoji: "📈",
                title: "Customizable Visualizations",
                description: "Create tailored charts and dashboards to bring your insights to life."
              },
              {
                emoji: "🎯",
                title: "Smart Preprocessing Rules",
                description: "Set rules for handling missing values, outliers, scaling, and more."
              },
              {
                emoji: "📤",
                title: "One-Click Export",
                description: "Export your processed data and charts in Excel, CSV, or ready-to-present slides."
              },
              {
                emoji: "🧩",
                title: "User-Friendly Interface",
                description: "Built for simplicity. Intuitive design for analysts, not just engineers."
              },
              {
                emoji: "🔒",
                title: "Secure and Private",
                description: "Your data stays yours. We follow best-in-class security practices."
              }
            ].map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-2xl">{feature.emoji} {feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">How Datanize Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Upload Dataset",
                description: "Upload CSV or Excel files easily."
              },
              {
                step: "2",
                title: "Apply Preprocessing",
                description: "Clean and transform your data with smart, customizable rules."
              },
              {
                step: "3",
                title: "Visualize Insights",
                description: "Generate charts and dashboards in just a few clicks."
              },
              {
                step: "4",
                title: "Export & Share",
                description: "Download your reports or share them directly with your team."
              }
            ].map((step, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-2xl">{step.step} ➔ {step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">See Datanize In Action</h2>
          <p className="text-xl mb-8">Transform messy data into clear, actionable insights in just minutes — no manual cleaning, no wasted hours.</p>
          <div className="relative max-w-4xl mx-auto">
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-blue-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Early User Feedback</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="pt-6">
                <p className="text-lg italic mb-4">"With Datanize, I automated tasks that used to take me hours. It feels like magic."</p>
                <p className="font-semibold">— Ritika S., Data Analyst</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-lg italic mb-4">"Finally a tool that understands both structured and unstructured data. Highly recommend it for consultants and analysts alike!"</p>
                <p className="font-semibold">— Daniel K., Consultant</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">About Datanize</h2>
          <p className="text-lg max-w-3xl mx-auto">
            Datanize was built to simplify the complex. Powered by cutting-edge frameworks like Next.js and FastAPI, we empower teams to automate tedious data preparation and unlock the true potential hidden in raw data. Our mission is simple: Help people work smarter, not harder.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="hover:text-gray-300">About</Link></li>
                <li><Link href="/contact" className="hover:text-gray-300">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-gray-300">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-gray-300">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Social Media</h3>
              <ul className="space-y-2">
                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">LinkedIn</a></li>
                <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">GitHub</a></li>
                <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p>© 2025 Datanize. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 