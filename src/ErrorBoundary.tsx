import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Rede de segurança: hoje qualquer exceção de render (ex.: um
 * `Math.max(...[])` ou um `useLiveQuery` que volta undefined)
 * derruba o app inteiro em tela branca, no meio do treino.
 *
 * Montar em main.tsx, envolvendo o <App />.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null, info: null });
  };

  private goHome = () => {
    window.location.hash = '#/home';
    this.reset();
    window.location.reload();
  };

  private copyDetails = async () => {
    const { error, info } = this.state;
    const text = [
      `Mensagem: ${error?.message ?? 'desconhecida'}`,
      '',
      `Stack: ${error?.stack ?? '-'}`,
      '',
      `Componentes: ${info?.componentStack ?? '-'}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      alert('Detalhes copiados. Cole aqui no chat que eu investigo.');
    } catch {
      console.log(text);
      alert('Não deu para copiar. Os detalhes ficaram no console.');
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-bg-0 text-text-1 flex items-center justify-center p-4 safe-top safe-bottom">
        <div className="w-full max-w-md rounded-2xl border border-danger/25 bg-bg-1 p-5 shadow-card-lg">
          <div className="text-[11px] font-mono-ui uppercase tracking-[0.2em] text-danger font-bold">
            Algo quebrou
          </div>
          <h1 className="text-xl font-bold font-display text-text-0 mt-1">
            A tela não conseguiu carregar
          </h1>
          <p className="text-[12px] text-text-2 mt-2 leading-relaxed">
            Seus dados continuam salvos. Tente recarregar; se voltar a acontecer,
            copie os detalhes e me mande.
          </p>

          <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-bg-2 p-3 text-[11px] leading-relaxed text-text-2 whitespace-pre-wrap break-words">
            {error.message || String(error)}
          </pre>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] rounded-2xl bg-accent text-black font-bold font-display active:scale-[0.97] transition-transform"
            >
              Recarregar
            </button>
            <button
              onClick={this.goHome}
              className="w-full min-h-[44px] rounded-2xl bg-white/[0.05] border border-white/[0.08] text-text-1 font-medium active:scale-[0.97] transition-transform"
            >
              Voltar ao início
            </button>
            <button
              onClick={this.copyDetails}
              className="w-full min-h-[44px] rounded-2xl text-text-2 text-sm active:scale-[0.97] transition-transform"
            >
              Copiar detalhes
            </button>
          </div>
        </div>
      </div>
    );
  }
}
