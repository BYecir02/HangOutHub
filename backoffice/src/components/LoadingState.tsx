
interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({ label = 'Chargement...' }: LoadingStateProps) {
  return <p className="text-sm text-slate-500">{label}</p>;
}

