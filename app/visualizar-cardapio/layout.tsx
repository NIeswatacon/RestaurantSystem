export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ padding: '2rem' }}>
        {children}
      </body>
    </html>
  )
}