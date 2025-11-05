"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Bell,
  ShieldAlert,
  UserRound,
  MessageCircle,
  MapPin,
  ClipboardList,
  Ambulance,
  ArrowLeft,
  Wrench, // Changed from Tool to Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHomeProps {
  onSOSAlert: () => void;
  onSelectView: (view: 'home' | 'chat' | 'cameras' | 'map' | 'profile' | 'police' | 'ambulance' | 'reports' | 'utilities') => void;
  onOpenProfileEdit: () => void;
  onEmergencyContact: (type: 'police' | 'ambulance') => void;
  onHelpAndReports: () => void;
}

const DashboardHome = ({
  onSOSAlert,
  onSelectView,
  onOpenProfileEdit,
  onEmergencyContact,
  onHelpAndReports,
}: DashboardHomeProps) => {
  const cards = [
    {
      id: 'cameras',
      icon: Camera,
      title: 'Câmeras',
      description: 'Visualizar câmeras próximas',
      color: 'text-blue-500',
      action: () => onSelectView('cameras'),
    },
    {
      id: 'utilities', // New card for Utilities
      icon: Wrench, // Changed from Tool to Wrench
      title: 'Utilidades',
      description: 'Contatos de emergência',
      color: 'text-teal-500',
      action: () => onSelectView('utilities'),
    },
    {
      id: 'sos',
      icon: Bell,
      title: 'SOS',
      description: 'Alerta de emergência',
      color: 'text-white',
      bgColor: 'bg-emergency hover:bg-emergency/90',
      action: onSOSAlert,
      isLarge: true,
    },
    {
      id: 'police',
      icon: ShieldAlert,
      title: 'Polícia',
      description: 'Contato de emergência',
      color: 'text-blue-600',
      action: () => onEmergencyContact('police'),
    },
    {
      id: 'profile',
      icon: UserRound,
      title: 'Meu Perfil',
      description: 'Gerenciar suas informações',
      color: 'text-gray-600',
      action: onOpenProfileEdit,
    },
    {
      id: 'chat',
      icon: MessageCircle,
      title: 'Conversas',
      description: 'Chat em tempo real',
      color: 'text-yellow-500',
      action: () => onSelectView('chat'),
    },
    {
      id: 'map',
      icon: MapPin,
      title: 'Mapa',
      description: 'Ver pontos de monitoramento',
      color: 'text-purple-500',
      action: () => onSelectView('map'),
    },
    {
      id: 'reports',
      icon: ClipboardList,
      title: 'Relatórios',
      description: 'Enviar ocorrências e ajuda',
      color: 'text-blue-700',
      action: onHelpAndReports,
    },
    {
      id: 'ambulance',
      icon: Ambulance,
      title: 'Ambulância',
      description: 'Contato de emergência',
      color: 'text-green-600',
      action: () => onEmergencyContact('ambulance'),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Button
          key={card.id}
          onClick={card.action}
          className={cn(
            "h-36 p-4 flex flex-col items-center justify-center text-center rounded-lg shadow-md transition-all duration-200",
            card.isLarge ? "col-span-2 md:col-span-1 bg-emergency hover:bg-emergency/90" : "bg-card hover:bg-muted/50",
            card.id === 'sos' ? 'shadow-glow' : 'hover:shadow-card',
            card.id === 'sos' ? 'text-white' : 'text-foreground'
          )}
          variant="ghost" // Use ghost to remove default button styling, then apply custom bg
        >
          <div className={cn(
            "p-3 rounded-full mb-2",
            card.id === 'sos' ? 'bg-white/20' : 'bg-muted'
          )}>
            <card.icon className={cn("h-8 w-8", card.color)} />
          </div>
          <p className="font-semibold text-lg">{card.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {card.description}
          </p>
        </Button>
      ))}
    </div>
  );
};

export default DashboardHome;