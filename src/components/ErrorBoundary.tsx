import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Keeps a single broken screen from blanking the whole app; offers a retry. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="max-w-[460px] text-center border border-line rounded-xl p-8">
          <div className="text-[1.1rem] font-semibold">This screen could not be displayed</div>
          <div className="font-mono text-[0.68rem] text-dim mt-2 break-all">{this.state.error.message}</div>
          <button onClick={() => this.setState({ error: null })} className="mt-5 bg-neon text-[#0a0a0a] rounded-md px-4 py-2 text-[0.82rem] font-semibold cursor-pointer">
            Try again
          </button>
        </div>
      </div>
    );
  }
}
