-- Crea tabella ospiti per gestire prenotazioni di non soci
CREATE TABLE public.ospiti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS per ospiti
ALTER TABLE public.ospiti ENABLE ROW LEVEL SECURITY;

-- Policy per ospiti
CREATE POLICY "Authenticated users can manage ospiti" 
ON public.ospiti 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Modifica tabella prenotazioni per supportare ospiti
ALTER TABLE public.prenotazioni 
ALTER COLUMN socio_id DROP NOT NULL;

ALTER TABLE public.prenotazioni 
ADD COLUMN ospite_id UUID REFERENCES public.ospiti(id);

-- Aggiungi constraint per assicurare che ci sia o socio_id o ospite_id
ALTER TABLE public.prenotazioni 
ADD CONSTRAINT prenotazioni_socio_or_ospite_check 
CHECK ((socio_id IS NOT NULL AND ospite_id IS NULL) OR (socio_id IS NULL AND ospite_id IS NOT NULL));

-- Trigger per aggiornare updated_at su ospiti
CREATE TRIGGER update_ospiti_updated_at
BEFORE UPDATE ON public.ospiti
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();