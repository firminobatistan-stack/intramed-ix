import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Radio,
  Trophy,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import { useCompetitionStore } from '../context/CompetitionStoreContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

/**
 * 14. NOTIFICAÇÕES E CENTRAL DE ALERTAS (Master Prompt)
 * Lista cronológica limpa para alertas de início de partida, gols/pontos,
 * resultados finais e lembretes, além de preferências de recebimento.
 */
export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    visibleMatches,
  } = useCompetitionStore();

  const [prefs, setPrefs] = useState({
    matchStart: true,
    goalsAndPoints: true,
    finalResults: true,
    officialAnnouncements: true,
  });

  // Eventos gerados nas súmulas em tempo real também alimentam alertas ao vivo
  const liveFeedAlerts = visibleMatches.filter((m) => m.status === 'live');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-blue-dark via-brand-blue to-brand-blue-medium text-white p-6 sm:p-7 shadow-elevated border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-display font-bold uppercase tracking-wider text-brand-yellow mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Central de Alertas • INTRAMED IX</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
            Notificações Esportivas
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1">
            Acompanhe avisos de início de jogo, placares ao vivo, encerramento de súmulas e comunicados oficiais.
          </p>
        </div>

        {notifications.length > 0 && (
          <Button
            variant="accent"
            size="sm"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            onClick={markAllNotificationsAsRead}
          >
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Alertas de Partidas em Andamento (se houver no Modo de Teste ou Oficial) */}
      {liveFeedAlerts.length > 0 && (
        <div className="space-y-2.5">
          <span className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue px-1 block">
            Em Andamento Agora
          </span>
          {liveFeedAlerts.map((match) => (
            <div
              key={match.id}
              onClick={() => navigate(`/placar/${match.id}`)}
              className="cursor-pointer rounded-2xl bg-white border-l-4 border-l-brand-yellow border border-brand-surface-border p-4 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-yellow-light text-brand-blue-dark flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-display font-extrabold text-brand-blue uppercase">
                    Partida Ao Vivo • {match.modalityName}
                  </span>
                  <p className="text-sm font-bold text-brand-text-primary">
                    {match.homeTeam.teamName} {match.homeTeam.score ?? 0} ×{' '}
                    {match.awayTeam.score ?? 0} {match.awayTeam.teamName}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-brand-blue">
                Abrir Match Center →
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Lista de Notificações ou Estado Vazio Planejado */}
      {notifications.length > 0 ? (
        <div className="rounded-3xl bg-white border border-brand-surface-border divide-y divide-brand-surface-border shadow-card overflow-hidden">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => markNotificationAsRead(item.id)}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                item.isRead ? 'bg-white' : 'bg-brand-blue-light/40'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-brand-yellow" />
                  )}
                  <h4 className="text-sm font-display font-bold text-brand-text-primary">
                    {item.title}
                  </h4>
                </div>
                <p className="text-xs text-brand-text-secondary">
                  {item.description}
                </p>
              </div>
              <span className="text-[11px] text-brand-text-muted shrink-0">
                {new Date(item.timestampIso).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          variant="live"
          title="Nenhuma notificação no momento"
          message="Os alertas de início de partida, gols, sets e resultados oficiais do INTRAMED IX aparecerão cronologicamente aqui."
        />
      )}

      {/* Preferências de Recebimento de Alertas */}
      <div className="rounded-3xl bg-white border border-brand-surface-border p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-brand-surface-border">
          <SlidersHorizontal className="w-4 h-4 text-brand-blue" />
          <h3 className="text-sm font-display font-extrabold text-brand-text-primary">
            Preferências de Alertas
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              key: 'matchStart',
              label: 'Início de Partida',
              desc: 'Aviso quando o cronômetro oficial for iniciado na mesa',
              icon: Calendar,
            },
            {
              key: 'goalsAndPoints',
              label: 'Gols, Sets e Pontos',
              desc: 'Atualizações em tempo real durante os confrontos',
              icon: Radio,
            },
            {
              key: 'finalResults',
              label: 'Resultado Consolidado',
              desc: 'Quando a súmula eletrônica da partida for encerrada',
              icon: Trophy,
            },
            {
              key: 'officialAnnouncements',
              label: 'Comunicados da Organização',
              desc: 'Avisos oficiais de tabela e chaveamento (A.A.A. Cangaceira)',
              icon: Bell,
            },
          ].map((pref) => {
            const Icon = pref.icon;
            const checked = prefs[pref.key as keyof typeof prefs];
            return (
              <button
                key={pref.key}
                type="button"
                onClick={() =>
                  setPrefs((prev) => ({
                    ...prev,
                    [pref.key]: !prev[pref.key as keyof typeof prev],
                  }))
                }
                className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                  checked
                    ? 'bg-brand-surface-muted border-brand-blue/30'
                    : 'bg-white border-brand-surface-border opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand-blue text-brand-yellow flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-display font-bold text-brand-text-primary">
                      {pref.label}
                    </span>
                    <span className="block text-[11px] text-brand-text-secondary truncate">
                      {pref.desc}
                    </span>
                  </div>
                </div>
                <span
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    checked ? 'bg-brand-blue justify-end' : 'bg-brand-surface-border justify-start'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full ${
                      checked ? 'bg-brand-yellow' : 'bg-white'
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
