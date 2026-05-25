import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lumio — Study Smarter',
  description: 'Your AI-powered study companion. Assignments, flashcards, Pomodoro, essay grading and more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
