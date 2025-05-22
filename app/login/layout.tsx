export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ padding: '2rem' }}>
        {children}
      </body>
    </html>
  )
}