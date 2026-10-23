import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../components/layout/BrandMark';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

/**
 * 6. LOGIN
 * Tela de login moderna e limpa, preparada para receber autenticação oficial.
 * Sem usuários de demonstração, sem login automático e sem credenciais fictícias.
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryFeedback, setRecoveryFeedback] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(
      'A autenticação será habilitada após o cadastro oficial de usuários pela organização.'
    );
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryFeedback(
      'A recuperação de acesso estará disponível assim que a base de usuários for ativada.'
    );
  };

  return (
    <div className="min-h-screen bg-brand-surface-muted flex flex-col justify-between p-4 sm:p-6">
      {/* Barra superior com retorno à navegação */}
      <div className="w-full max-w-md mx-auto pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-text-secondary hover:text-brand-text-primary hover:bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao início</span>
        </button>
      </div>

      {/* Card Central de Login */}
      <div className="w-full max-w-md mx-auto my-6">
        <div className="relative overflow-hidden bg-white rounded-3xl border border-brand-surface-border shadow-card p-6 sm:p-8">
          <img
            src="/assets/atletica/face-monocor.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute -right-8 -top-8 w-40 h-40 object-contain opacity-[0.04]"
          />

          {/* Identidade Visual INTRAMED IX + Atlética Cangaceira */}
          <div className="relative z-10 flex flex-col items-center text-center mb-8">
            <img
              src="/assets/atletica/logo.png"
              alt="A.A.A. Cangaceira — Medicina UEMA"
              className="w-24 h-24 object-contain drop-shadow-md mb-3"
            />
            <BrandMark size="lg" showEmblem={false} />
            <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surface-muted border border-brand-surface-border">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
                Acesso Oficial • A.A.A. Cangaceira
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Usuário ou E-mail"
              type="email"
              name="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              placeholder="Digite seu usuário ou e-mail"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <div className="space-y-1.5">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (statusMessage) setStatusMessage(null);
                }}
                placeholder="Digite sua senha"
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="p-1.5 rounded-lg hover:bg-brand-surface-muted text-brand-text-muted hover:text-brand-text-primary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                required
              />

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryFeedback(null);
                    setIsRecoveryModalOpen(true);
                  }}
                  className="text-xs font-semibold text-brand-blue hover:text-brand-blue-medium transition-colors focus:outline-none focus-visible:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            {statusMessage && (
              <div
                role="status"
                className="p-3.5 rounded-xl bg-brand-blue-light/70 border border-brand-blue/15 flex items-start gap-2.5 text-xs text-brand-blue leading-relaxed"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-brand-blue" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" variant="primary" size="lg" fullWidth>
                Entrar
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Rodapé minimalista */}
      <div className="w-full max-w-md mx-auto pb-2 text-center">
        <p className="text-xs text-brand-text-muted font-medium">INTRAMED IX</p>
      </div>

      {/* Modal de Recuperação de Senha */}
      <Modal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        title="Recuperação de Senha"
        description="Informe o e-mail vinculado ao seu cadastro para receber as instruções."
      >
        <form onSubmit={handleRecoverySubmit} className="space-y-4">
          <Input
            label="E-mail cadastrado"
            type="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            placeholder="Digite seu e-mail"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          {recoveryFeedback && (
            <div className="p-3 rounded-xl bg-brand-surface-muted border border-brand-surface-border text-xs text-brand-text-secondary">
              {recoveryFeedback}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRecoveryModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Solicitar recuperação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
