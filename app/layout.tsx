export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="app-body">
        {children}
      </body>
    </html>
  )
}
