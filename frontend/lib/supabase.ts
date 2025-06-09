import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpmbovstapzagvznpmkf.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbWJvdnN0YXB6YWd2em5wbWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MzIwMTMsImV4cCI6MjA2MDMwODAxM30.Jg5OaUcMEyoTYP9zMcvZbzJlVGtSXE6eo0h8m0P8-S8'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}) 