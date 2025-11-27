import * as LucideIcons from 'lucide-react';
import { HelpCircle } from 'lucide-react'; // Fallback icon

// Esta função permite obter um componente de ícone Lucide pelo seu nome em string.
// Útil para renderização dinâmica ou para evitar importações nomeadas diretas em alguns contextos.
export const getLucideIconByName = (iconName: string): React.ComponentType<any> => {
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || HelpCircle; // Fallback para HelpCircle se o ícone não for encontrado
};

// Re-exporta todos os ícones para conveniência, caso importações diretas ainda sejam desejadas em outros lugares.
// No entanto, para AdminPanel.tsx, usaremos getLucideIconByName para todos os ícones.
export * from 'lucide-react';