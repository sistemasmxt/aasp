"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import QRCode from 'react-qr-code'; // Changed import to react-qr-code
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import logo from '@/img/logo.png';

const PIX_KEY = "61999999999"; // CNPJ
const PIX_NAME = "ASSOCIACAO DE APOIO A SEGURANCA PUBLICA";
const INITIAL_PAYMENT_AMOUNT = "132.00"; // R$132,00

const InitialPayment = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'pending' | 'paid'>('unpaid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      checkUserPaymentStatus();
    } else if (!authLoading && !user) {
      navigate('/auth'); // Redirect to auth if not logged in
    }
  }, [user, authLoading, navigate]);

  const checkUserPaymentStatus = async () => {
    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('initial_payment_status, is_approved')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (profile.is_approved) {
        setPaymentStatus('paid');
        toast({
          title: "Acesso Aprovado!",
          description: "Seu pagamento foi confirmado e seu acesso está liberado.",
          variant: "success",
        });
        navigate('/dashboard', { replace: true });
      } else {
        setPaymentStatus(profile.initial_payment_status);
      }
    } catch (error: any) {
      console.error("Error checking payment status:", error.message);
      toast({
        title: "Erro ao verificar status de pagamento",
        description: "Não foi possível carregar suas informações de pagamento.",
        variant: "destructive",
      });
      setPaymentStatus('unpaid'); // Fallback to unpaid if error
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyAdmin = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ initial_payment_status: 'pending' })
        .eq('id', user.id);

      if (error) throw error;

      setPaymentStatus('pending');
      toast({
        title: "Notificação enviada!",
        description: "O administrador foi notificado sobre seu pagamento. Aguarde a aprovação.",
      });
    } catch (error: any) {
      console.error("Error notifying admin:", error.message);
      toast({
        title: "Erro ao notificar administrador",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pixPayload = `pix://payload?pixkey=${PIX_KEY}&amount=${INITIAL_PAYMENT_AMOUNT}&name=${encodeURIComponent(PIX_NAME)}`;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center">
          <img src={logo} alt="AASP Logo" className="h-20 w-20 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando informações de pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-glow text-center">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="AASP Logo" className="h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Pagamento de Adesão</h1>
          <p className="text-muted-foreground mt-2">
            Para ativar seu acesso completo, realize o pagamento de adesão.
          </p>
        </div>

        {paymentStatus === 'paid' ? (
          <div className="space-y-4">
            <CheckCircle className="h-24 w-24 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Pagamento Confirmado!</h2>
            <p className="text-muted-foreground">
              Seu acesso foi aprovado. Você será redirecionado para o painel.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Ir para o Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <CardContent className="p-0">
              <div className="bg-white p-4 rounded-lg inline-block">
                {/* Using react-qr-code component */}
                <QRCode value={pixPayload} size={256} />
              </div>
              <p className="text-lg font-semibold text-foreground mt-4">Valor: R$ {INITIAL_PAYMENT_AMOUNT}</p>
              <p className="text-sm text-muted-foreground">Chave PIX (CNPJ): {PIX_KEY}</p>
              <p className="text-sm text-muted-foreground">Recebedor: {PIX_NAME}</p>
            </CardContent>

            <CardDescription className="text-sm text-muted-foreground">
              Escaneie o QR Code acima com o aplicativo do seu banco para realizar o pagamento de adesão.
              Após o pagamento, clique no botão abaixo para notificar o administrador.
            </CardDescription>

            <Button
              onClick={handleNotifyAdmin}
              disabled={paymentStatus === 'pending' || loading}
              className="w-full"
            >
              {paymentStatus === 'pending' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aguardando Aprovação...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Já Paguei! Notificar Administrador
                </>
              )}
            </Button>

            <Button variant="ghost" onClick={() => navigate('/')} className="text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Home
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InitialPayment;