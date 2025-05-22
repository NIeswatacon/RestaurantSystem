// app/(private)/cardapio/page.tsx
import { getUsuarioLogado, UsuarioLogado } from '@/lib/auth'; // Importe o tipo UsuarioLogado também
import { redirect } from 'next/navigation';

// Como esta é uma página no App Router, ela pode ser um Componente de Servidor Async
export default async function CardapioAdmin() { // 1. Adicione 'async' aqui
  const usuario: UsuarioLogado | null = await getUsuarioLogado(); // 2. Adicione 'await' e o tipo

  // Verifica se o usuário não está logado ou não é admin
  if (!usuario || usuario.role !== 'admin') {
    // Se o objetivo é proteger a rota, um middleware é mais robusto.
    // Mas para uma verificação no nível da página, isso funciona.
    // Você pode redirecionar para a página de login ou para a home.
    // Se redirecionar para o login, cuidado com loops de redirecionamento.
    // redirect('/login?error=unauthorized'); // Exemplo
    return redirect('/'); // Redireciona para a home se não for admin
  }

  // Agora 'usuario' é o objeto do usuário real (ou null se não logado)
  // e você pode acessar usuario.role com segurança.
  return (
    <div>
      <h1>Gerenciar Cardápio</h1>
      <p>Bem-vindo, {usuario.nome}! Área restrita ao administrador.</p>
      {/* Aqui você colocará os formulários e a lógica para gerenciar o cardápio */}
    </div>
  );
}