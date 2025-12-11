import { z } from 'zod';

// User validation schema
export const userSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  phone: z.string().regex(/^\+?[\d\s()-]{10,20}$/, 'Telefone inválido').optional().or(z.literal('')),
  address: z.string().max(500, 'Endereço muito longo').optional().or(z.literal('')),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  is_approved: z.boolean().optional(),
  initial_payment_status: z.enum(['pending', 'paid']).optional(),
});

// Camera validation schema
export const cameraSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  ip_address: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'IP inválido').refine((ip) => {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }, 'IP deve estar no range válido (0-255)'),
  latitude: z.number().min(-90, 'Latitude inválida').max(90, 'Latitude inválida'),
  longitude: z.number().min(-180, 'Longitude inválida').max(180, 'Longitude inválida'),
  neighborhood: z.string().max(100, 'Bairro muito longo').optional().or(z.literal('')),
  street: z.string().max(200, 'Rua muito longa').optional().or(z.literal('')),
  city: z.string().max(100, 'Cidade muito longa').optional().or(z.literal('')),
  stream_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

// Payment validation schema
export const paymentSchema = z.object({
  user_id: z.string().uuid('Usuário inválido'),
  amount: z.number().min(0.01, 'Valor mínimo é R$ 0,01').max(999999.99, 'Valor muito alto'),
  due_date: z.string().min(1, 'Data de vencimento obrigatória'),
  status: z.enum(['pending', 'paid', 'overdue'], { required_error: 'Status obrigatório' }),
  payment_type: z.enum(['initial', 'recurring', 'monthly'], { required_error: 'Tipo de pagamento obrigatório' }),
  description: z.string().max(500, 'Descrição muito longa').optional().or(z.literal('')),
});

// Emergency alert validation schema
export const emergencyAlertSchema = z.object({
  latitude: z.number().min(-90, 'Latitude inválida').max(90, 'Latitude inválida'),
  longitude: z.number().min(-180, 'Longitude inválida').max(180, 'Longitude inválida'),
  alert_type: z.string().min(1, 'Tipo de alerta obrigatório'),
  message: z.string().max(1000, 'Mensagem muito longa').optional().or(z.literal('')),
});

// Chat message validation schema
export const messageSchema = z.object({
  content: z.string().min(1, 'Mensagem não pode estar vazia').max(5000, 'Mensagem muito longa'),
  message_type: z.enum(['text', 'image', 'video', 'audio', 'file']),
});

// Public Utility Contact validation schema
export const publicUtilityContactSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  phone: z.string().regex(/^\+?[\d\s()-]{10,20}$/, 'Telefone inválido'),
  whatsapp: z.string().regex(/^\+?[\d\s()-]{10,20}$/, 'WhatsApp inválido').optional().or(z.literal('')),
  description: z.string().max(500, 'Descrição muito longa').optional().or(z.literal('')),
  icon_name: z.string().min(1, 'Nome do ícone obrigatório'),
  color_class: z.string().min(1, 'Classe de cor obrigatória'),
});

// SOS Pet validation schema
export const sosPetSchema = z.object({
  pet_name: z.string().min(2, 'Nome do pet deve ter pelo menos 2 caracteres').max(100, 'Nome do pet muito longo'),
  species: z.string().min(2, 'Espécie deve ter pelo menos 2 caracteres').max(50, 'Espécie muito longa'),
  breed: z.string().max(100, 'Raça muito longa').optional().or(z.literal('')),
  description: z.string().max(1000, 'Descrição muito longa').optional().or(z.literal('')),
  last_seen_location: z.string().max(255, 'Localização muito longa').optional().or(z.literal('')),
  latitude: z.number().min(-90, 'Latitude inválida').max(90, 'Latitude inválida').optional().or(z.literal(null)),
  longitude: z.number().min(-180, 'Longitude inválida').max(180, 'Longitude inválida').optional().or(z.literal(null)),
  contact_phone: z.string().regex(/^\+?[\d\s()-]{10,20}$/, 'Telefone de contato inválido'),
  contact_email: z.string().email('E-mail de contato inválido').max(255, 'E-mail muito longo').optional().or(z.literal('')),
  image_url: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  status: z.enum(['active', 'found', 'resolved']).optional(),
});

// Anonymous Report validation schema
export const anonymousReportSchema = z.object({
  report_type: z.string().min(3, 'Tipo de denúncia obrigatório').max(100, 'Tipo de denúncia muito longo'),
  location_description: z.string().max(255, 'Descrição da localização muito longa').optional().or(z.literal('')),
  latitude: z.number().min(-90, 'Latitude inválida').max(90, 'Latitude inválida').optional().or(z.literal(null)),
  longitude: z.number().min(-180, 'Longitude inválida').max(180, 'Longitude inválida').optional().or(z.literal(null)),
  description: z.string().min(10, 'Descrição da denúncia deve ter pelo menos 10 caracteres').max(1000, 'Descrição da denúncia muito longa'),
  image_url: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  status: z.enum(['pending', 'investigating', 'resolved']).optional(),
});
