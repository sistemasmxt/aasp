"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Siren, Building2, Scale, Heart, Users, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Contact {
  name: string;
  phone: string;
  whatsapp?: string;
  description?: string;
  icon: React.ElementType;
  color: string;
}

const UtilitiesList = () => {
  const emergencyContacts: Contact[] = [
    {
      name: 'Polícia Militar de Santa Maria',
      phone: '55999390190',
      whatsapp: '55999390190',
      description: 'Contato direto via WhatsApp',
      icon: Siren,
      color: 'text-blue-600',
    },
    {
      name: 'Polícia Rodoviária Federal',
      phone: '55991233488',
      whatsapp: '55991233488',
      description: 'Contato via WhatsApp',
      icon: Building2,
      color: 'text-green-600',
    },
    {
      name: '190 - Polícia Militar',
      phone: '190',
      description: 'Emergência policial',
      icon: Siren,
      color: 'text-blue-600',
    },
    {
      name: '192 - SAMU',
      phone: '192',
      description: 'Serviço de Atendimento Móvel de Urgência',
      icon: Heart,
      color: 'text-red-600',
    },
    {
      name: '193 - Corpo de Bombeiros',
      phone: '193',
      description: 'Emergência de incêndio e resgate',
      icon: Siren,
      color: 'text-orange-600',
    },
    {
      name: 'Corpo de Bombeiros de Santa Maria',
      phone: '5584545968',
      whatsapp: '5584545968',
      description: 'Contato via WhatsApp',
      icon: Siren,
      color: 'text-orange-600',
    },
    {
      name: '181 - Disque Denúncia',
      phone: '51984440606',
      whatsapp: '51984440606',
      description: 'WhatsApp Polícia Civil',
      icon: Scale,
      color: 'text-gray-600',
    },
    {
      name: '188 - Centro de Valorização da Vida (CVV)',
      phone: '188',
      description: 'Apoio emocional e prevenção do suicídio',
      icon: Heart,
      color: 'text-purple-600',
    },
    {
      name: '100 - Disque Direitos Humanos',
      phone: '100',
      description: 'Denúncias de violações de direitos humanos',
      icon: Users,
      color: 'text-yellow-600',
    },
    {
      name: 'CIOSP de Santa Maria - RS',
      phone: '55992178122',
      description: 'Centro Integrado de Operações de Segurança',
      icon: MapPin,
      color: 'text-indigo-600',
    },
    {
      name: 'CIOSP de Santa Maria - RS',
      phone: '55991674728',
      description: 'Centro Integrado de Operações de Segurança',
      icon: MapPin,
      color: 'text-indigo-600',
    },
    {
      name: 'CIOSP de Santa Maria - RS',
      phone: '55991678452',
      description: 'Centro Integrado de Operações de Segurança',
      icon: MapPin,
      color: 'text-indigo-600',
    },
    {
      name: 'Brigada Militar de Santa Maria - RS',
      phone: '55999390190',
      description: 'Para entrar em contato com a Brigada Militar',
      icon: Siren,
      color: 'text-blue-600',
    },
    {
      name: 'Brigada Militar de São Pedro do Sul',
      phone: '32761190',
      description: 'Contato direto',
      icon: Siren,
      color: 'text-blue-600',
    },
    {
      name: '2º Batalhão de Polícia de Choque',
      phone: '5532133019',
      whatsapp: '5532133019',
      description: 'Brigada Militar',
      icon: Siren,
      color: 'text-blue-600',
    },
  ];

  return (
    <Card className="p-6">
      <CardHeader className="mb-6">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Siren className="h-7 w-7 text-primary" />
          Contatos de Utilidade Pública
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emergencyContacts.map((contact, index) => (
          <Card key={index} className="p-4 flex flex-col justify-between hover:shadow-card transition-shadow">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <contact.icon className={`h-6 w-6 ${contact.color}`} />
                <h3 className="font-semibold text-lg text-foreground">{contact.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{contact.description}</p>
            </div>
            <div className="flex gap-2 mt-auto">
              <Button asChild className="flex-1">
                <a href={`tel:${contact.phone.replace(/\D/g, '')}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </a>
              </Button>
              {contact.whatsapp && (
                <Button asChild variant="outline" className="flex-1">
                  <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};

export default UtilitiesList;