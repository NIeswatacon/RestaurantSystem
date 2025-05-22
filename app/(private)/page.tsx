'use client'

import { useEffect, useState } from 'react';

interface Mesa {
  id: string;
  numero: number;
}

interface ReservaComSituacao {
  id: string;
  nome: string;
  dataHoraInicio: string;
  pessoas: number;
  status: string;
  situacaoAdmin?: string;
  mesa: Mesa;
}

interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  role: string;
}

export default function AdminReservasPage() {
  const [reservas, setReservas] = useState<ReservaComSituacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UsuarioLogado | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (!data.usuario || data.usuario.role !== 'admin') {
        window.location.href = '/';
      } else {
        setCurrentUser(data.usuario);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchReservas();
    }
  }, [currentUser]);

  async function fetchReservas() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reservas');
      if (!res.ok) throw new Error('Falha ao buscar reservas');
      const data: ReservaComSituacao[] = await res.json();
      setReservas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(reservaId: string, novoStatus: string) {
    try {
      const response = await fetch(`/api/reservas/${reservaId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar status');
      }
      await fetchReservas();
      alert(`Reserva ${novoStatus.replace('_', ' ')} com sucesso!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  }

  if (loading) return <p>Carregando reservas...</p>;
  if (error) return <p>Erro: {error}</p>;

  return (
    <div>
      <h1>Gerenciar Reservas (Admin)</h1>
      {reservas.length === 0 ? (
        <p>Nenhuma reserva encontrada.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Horário</th>
              <th>Pessoas</th>
              <th>Mesa</th>
              <th>Status</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id}>
                <td>{r.id.slice(0, 6)}...</td>
                <td>{r.nome}</td>
                <td>{new Date(r.dataHoraInicio).toLocaleString()}</td>
                <td>{r.pessoas}</td>
                <td>{r.mesa?.numero || 'N/A'}</td>
                <td>{r.status}</td>
                <td>{r.situacaoAdmin || 'N/A'}</td>
                <td>
                  {r.status === 'confirmada' && r.situacaoAdmin === 'pode_fazer_checkin' && (
                    <button onClick={() => handleUpdateStatus(r.id, 'check_in_realizado')}>
                      Check-in
                    </button>
                  )}
                  {r.status === 'confirmada' && r.situacaoAdmin === 'atrasada_pode_cancelar' && (
                    <button onClick={() => handleUpdateStatus(r.id, 'no_show')}>
                      No-Show
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
