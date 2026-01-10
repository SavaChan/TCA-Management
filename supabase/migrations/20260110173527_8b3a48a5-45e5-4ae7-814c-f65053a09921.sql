-- Rimuovi il vecchio constraint
ALTER TABLE public.prenotazioni DROP CONSTRAINT IF EXISTS prenotazioni_socio_or_ospite_check;

-- Aggiungi il nuovo constraint che permette:
-- 1. socio_id NOT NULL e ospite_id NULL (prenotazione socio)
-- 2. socio_id NULL e ospite_id NOT NULL (prenotazione ospite)
-- 3. socio_id NULL e ospite_id NULL (competizione)
ALTER TABLE public.prenotazioni ADD CONSTRAINT prenotazioni_socio_or_ospite_or_competition_check 
CHECK (
  ((socio_id IS NOT NULL) AND (ospite_id IS NULL)) OR 
  ((socio_id IS NULL) AND (ospite_id IS NOT NULL)) OR 
  ((socio_id IS NULL) AND (ospite_id IS NULL))
);