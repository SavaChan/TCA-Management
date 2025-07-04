-- Create enum for member types
CREATE TYPE public.tipo_socio AS ENUM ('frequentatore', 'non_agonista', 'agonista', 'maestro');

-- Create enum for payment status
CREATE TYPE public.stato_pagamento AS ENUM ('pagato', 'da_pagare');

-- Create enum for court type
CREATE TYPE public.tipo_campo AS ENUM ('scoperto', 'coperto');

-- Create enum for booking type
CREATE TYPE public.tipo_prenotazione AS ENUM ('singolare', 'doppio', 'corso', 'lezione');

-- Create profiles table for admin users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  ruolo TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create members table
CREATE TABLE public.soci (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  tipo_socio tipo_socio NOT NULL,
  classifica_fitp TEXT, -- per agonisti (es: NC, 4.3, 3.1, 2.7)
  certificato_medico_scadenza DATE, -- obbligatorio per non frequentatori
  note TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rates table
CREATE TABLE public.tariffe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL, -- es: "Singolare Diurno Soci Campo Scoperto"
  tipo_prenotazione tipo_prenotazione NOT NULL,
  tipo_campo tipo_campo NOT NULL,
  diurno BOOLEAN NOT NULL DEFAULT true,
  soci BOOLEAN NOT NULL DEFAULT true, -- true = tariffa soci, false = non soci
  prezzo_ora DECIMAL(10,2) NOT NULL,
  prezzo_mezz_ora DECIMAL(10,2) NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.prenotazioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  socio_id UUID NOT NULL REFERENCES public.soci(id) ON DELETE CASCADE,
  campo INTEGER NOT NULL CHECK (campo IN (1, 2)),
  data DATE NOT NULL,
  ora_inizio TIME NOT NULL,
  ora_fine TIME NOT NULL,
  tipo_prenotazione tipo_prenotazione NOT NULL,
  tipo_campo tipo_campo NOT NULL,
  diurno BOOLEAN NOT NULL,
  importo DECIMAL(10,2) NOT NULL,
  stato_pagamento stato_pagamento NOT NULL DEFAULT 'da_pagare',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campo, data, ora_inizio, ora_fine)
);

-- Create payments table for tracking
CREATE TABLE public.pagamenti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prenotazione_id UUID NOT NULL REFERENCES public.prenotazioni(id) ON DELETE CASCADE,
  importo DECIMAL(10,2) NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metodo_pagamento TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soci ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariffe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prenotazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamenti ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users (admin/maestri)
CREATE POLICY "Authenticated users can manage profiles" ON public.profiles FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage soci" ON public.soci FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage tariffe" ON public.tariffe FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage prenotazioni" ON public.prenotazioni FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage pagamenti" ON public.pagamenti FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_soci_updated_at BEFORE UPDATE ON public.soci FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tariffe_updated_at BEFORE UPDATE ON public.tariffe FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prenotazioni_updated_at BEFORE UPDATE ON public.prenotazioni FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default rates
INSERT INTO public.tariffe (nome, tipo_prenotazione, tipo_campo, diurno, soci, prezzo_ora, prezzo_mezz_ora) VALUES
  ('Singolare Diurno Soci Campo Scoperto', 'singolare', 'scoperto', true, true, 15.00, 8.00),
  ('Singolare Notturno Soci Campo Scoperto', 'singolare', 'scoperto', false, true, 18.00, 10.00),
  ('Singolare Diurno Non Soci Campo Scoperto', 'singolare', 'scoperto', true, false, 20.00, 12.00),
  ('Singolare Notturno Non Soci Campo Scoperto', 'singolare', 'scoperto', false, false, 25.00, 15.00),
  ('Doppio Diurno Soci Campo Scoperto', 'doppio', 'scoperto', true, true, 20.00, 12.00),
  ('Doppio Notturno Soci Campo Scoperto', 'doppio', 'scoperto', false, true, 25.00, 15.00),
  ('Corso Campo Scoperto', 'corso', 'scoperto', true, true, 25.00, 15.00),
  ('Lezione Individuale Campo Scoperto', 'lezione', 'scoperto', true, true, 35.00, 20.00);

-- Function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Admin'), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();