"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, CheckCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

interface PaymentDetails {
  id: string;
  amount: number;
  description: string | null;
  payment_type: Tables<'payments'>['payment_type'];
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentDetails: PaymentDetails | null;
  onPaymentProcessed: () => void;
}

const PIX_KEY = "61959355000105"; // CNPJ
const PIX_NAME = "ASSOCIACAO DE APOIO A SEGURANCA PUBLICA";

export const PaymentModal = ({ isOpen, onClose, paymentDetails, onPaymentProcessed }: PaymentModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!paymentDetails) return null;

  const formattedAmount = paymentDetails.amount.toFixed(2);
  const pixPayload = `pix://payload?pixkey=${PIX_KEY}&amount=${formattedAmount}&name=${encodeURIComponent(PIX_NAME)}`;

  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      toast({
        title: "Chave PIX Copiada!",
        description: "A chave foi copiada para a área de transferência.",
      });
    } catch (err) {
      console.error('Failed to copy PIX key:', err);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a chave PIX. Tente manualmente.",
        variant: "destructive",
      });
    }
  };

  const handleNotifyAdmin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-payment-notification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: paymentDetails.id,
          amount: paymentDetails.amount,
          description: paymentDetails.description,
        }),
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      toast({
        title: "Notificação enviada!",
        description: "O administrador foi notificado sobre seu pagamento. Aguarde a aprovação.",
      });
      onPaymentProcessed(); // Trigger refetch and close modal
    } catch (error: any) {
      console.error("Error notifying admin:", error.message);
      toast({
        title: "Erro ao notificar administrador",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-8 text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Realizar Pagamento</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            Escaneie o QR Code ou use a chave PIX para pagar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <div className="bg-white p-4 rounded-lg inline-block">
            <QRCode value={pixPayload} size={256} />
          </div>
          <p className="text-lg font-semibold text-foreground">Valor: R$ {formattedAmount}</p>
          <p className="text-sm text-muted-foreground">Descrição: {paymentDetails.description || 'Pagamento'}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">Chave PIX (CNPJ): {PIX_KEY}</p>
            <Button variant="ghost" size="icon" onClick={handleCopyPixKey} className="h-7 w-7">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Recebedor: {PIX_NAME}</p>

          <Button
            onClick={handleNotifyAdmin}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Notificando Administrador...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Já Paguei! Notificar Administrador
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};