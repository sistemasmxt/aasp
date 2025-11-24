CREATE TABLE public.public_utility_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    whatsapp text,
    description text,
    icon_name text NOT NULL,
    color_class text NOT NULL,
    CONSTRAINT public_utility_contacts_pkey PRIMARY KEY (id),
    CONSTRAINT public_utility_contacts_name_key UNIQUE (name)
);

ALTER TABLE public.public_utility_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.public_utility_contacts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.public_utility_contacts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.public_utility_contacts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.public_utility_contacts FOR DELETE USING (auth.role() = 'authenticated');

-- Optional: Add some initial data
INSERT INTO public.public_utility_contacts (name, phone, whatsapp, description, icon_name, color_class) VALUES
('Polícia Militar', '190', '5548999999999', 'Emergência policial', 'ShieldAlert', 'text-blue-600'),
('Ambulância (SAMU)', '192', NULL, 'Emergência médica', 'Ambulance', 'text-green-600'),
('Bombeiros', '193', NULL, 'Emergência de incêndio e resgate', 'Siren', 'text-red-600');