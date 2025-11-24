-- Create public_utility_contacts table
CREATE TABLE public.public_utility_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    description TEXT,
    icon_name TEXT NOT NULL, -- Stores Lucide icon name (e.g., 'Siren', 'Phone')
    color_class TEXT NOT NULL, -- Stores Tailwind CSS color class (e.g., 'text-blue-600')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.public_utility_contacts ENABLE ROW LEVEL SECURITY;

-- Policy for full access for admins
CREATE POLICY "Admins can manage public utility contacts"
ON public.public_utility_contacts
FOR ALL
USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Policy for read-only access for authenticated users
CREATE POLICY "Authenticated users can view public utility contacts"
ON public.public_utility_contacts
FOR SELECT
USING (auth.role() = 'authenticated');

-- Set up trigger for updated_at
CREATE FUNCTION update_public_utility_contacts_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_public_utility_contacts_updated_at
BEFORE UPDATE ON public.public_utility_contacts
FOR EACH ROW
EXECUTE FUNCTION update_public_utility_contacts_updated_at_column();

-- Insert initial data (from existing UtilitiesList.tsx)
INSERT INTO public.public_utility_contacts (name, phone, whatsapp, description, icon_name, color_class) VALUES
('Polícia Militar de Santa Maria', '55999390190', '55999390190', 'Contato direto via WhatsApp', 'Siren', 'text-blue-600'),
('Polícia Rodoviária Federal', '55991233488', '55991233488', 'Contato via WhatsApp', 'Building2', 'text-green-600'),
('190 - Polícia Militar', '190', NULL, 'Emergência policial', 'Siren', 'text-blue-600'),
('192 - SAMU', '192', NULL, 'Serviço de Atendimento Móvel de Urgência', 'Heart', 'text-red-600'),
('193 - Corpo de Bombeiros', '193', NULL, 'Emergência de incêndio e resgate', 'Siren', 'text-orange-600'),
('Corpo de Bombeiros de Santa Maria', '5584545968', '5584545968', 'Contato via WhatsApp', 'Siren', 'text-orange-600'),
('181 - Disque Denúncia', '51984440606', '51984440606', 'WhatsApp Polícia Civil', 'Scale', 'text-gray-600'),
('188 - Centro de Valorização da Vida (CVV)', '188', NULL, 'Apoio emocional e prevenção do suicídio', 'Heart', 'text-purple-600'),
('100 - Disque Direitos Humanos', '100', NULL, 'Denúncias de violações de direitos humanos', 'Users', 'text-yellow-600'),
('CIOSP de Santa Maria - RS', '55992178122', NULL, 'Centro Integrado de Operações de Segurança', 'MapPin', 'text-indigo-600'),
('CIOSP de Santa Maria - RS', '55991674728', NULL, 'Centro Integrado de Operações de Segurança', 'MapPin', 'text-indigo-600'),
('CIOSP de Santa Maria - RS', '55991678452', NULL, 'Centro Integrado de Operações de Segurança', 'MapPin', 'text-indigo-600'),
('Brigada Militar de Santa Maria - RS', '55999390190', NULL, 'Para entrar em contato com a Brigada Militar', 'Siren', 'text-blue-600'),
('Brigada Militar de São Pedro do Sul', '32761190', NULL, 'Contato direto', 'Siren', 'text-blue-600'),
('2º Batalhão de Polícia de Choque', '5532133019', '5532133019', 'Brigada Militar', 'Siren', 'text-blue-600');