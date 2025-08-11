-- Aggiungi un vincolo univoco per evitare prenotazioni duplicate
-- Prima rimuovi eventuali duplicati esistenti (mantieni il più recente)
DELETE FROM prenotazioni 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER(
             PARTITION BY data, ora_inizio, campo 
             ORDER BY created_at DESC
           ) as rn
    FROM prenotazioni
  ) t 
  WHERE t.rn > 1
);

-- Aggiungi il vincolo univoco
ALTER TABLE prenotazioni 
ADD CONSTRAINT unique_prenotazione_slot 
UNIQUE (data, ora_inizio, campo);