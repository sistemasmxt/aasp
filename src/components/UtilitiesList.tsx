"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Siren, Building2, Scale, Heart, Users, MapPin, Wrench, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';

interface PublicUtilityContact {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  description: string | null;
  icon_name: string;
  color_class: string;
}

// Dynamically get Lucide icons
const getLucideIcon = (iconName: string) => {
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || HelpCircle; // Fallback to a default icon
};

const UtilitiesList = () => {
  const [contacts, setContacts] = useState<PublicUtilityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('public_utility_contacts' as any)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts((data as unknown as PublicUtilityContact[]) || []);
    } catch (error: any) {
      console.log('Table public_utility_contacts may not exist yet:', error.message);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando contatos de utilidade pública...</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Nenhum contato de utilidade pública cadastrado
          </h3>
          <p className="text-muted-foreground">
            Os contatos serão exibidos aqui
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="mb-6">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Wrench className="h-7 w-7 text-primary" />
          Contatos de Utilidade Pública
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map((contact, index) => {
          const IconComponent = getLucideIcon(contact.icon_name);
          return (
            <Card key={contact.id} className="p-4 flex flex-col justify-between hover:shadow-card transition-shadow">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <IconComponent className={`h-6 w-6 ${contact.color_class}`} />
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
          );
        })}
      </CardContent>
    </Card>
  );
};

export default UtilitiesList;