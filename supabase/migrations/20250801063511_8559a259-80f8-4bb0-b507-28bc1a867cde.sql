-- Add campo per tracciare prenotazioni annullate per pioggia
ALTER TABLE public.prenotazioni 
ADD COLUMN annullata_pioggia boolean NOT NULL DEFAULT false;

-- Add timestamp per quando è stata annullata
ALTER TABLE public.prenotazioni 
ADD COLUMN data_annullamento_pioggia timestamp with time zone;