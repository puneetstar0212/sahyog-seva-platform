import * as Icons from 'lucide-react';

export function ServiceIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name];
  return Icon ? <Icon size={size} /> : <Icons.Wrench size={size} />;
}
