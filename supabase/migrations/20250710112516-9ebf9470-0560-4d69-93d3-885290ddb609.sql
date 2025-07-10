-- Modifica la tabella pagamenti per includere metodi di pagamento specifici
ALTER TABLE public.pagamenti 
ADD COLUMN IF NOT EXISTS metodo_pagamento_tipo VARCHAR(20) DEFAULT 'contanti' 
CHECK (metodo_pagamento_tipo IN ('contanti', 'pos'));

-- Aggiorna la colonna esistente metodo_pagamento per essere più specifica
COMMENT ON COLUMN public.pagamenti.metodo_pagamento IS 'Dettagli aggiuntivi del pagamento';
COMMENT ON COLUMN public.pagamenti.metodo_pagamento_tipo IS 'Tipo di pagamento: contanti o pos';

-- Inserisci alcuni dati di esempio per il Tennis Club Arenzano

-- Soci di esempio
INSERT INTO public.soci (nome, cognome, telefono, email, tipo_socio, classifica_fitp, attivo) VALUES
('Marco', 'Rossi', '3331234567', 'marco.rossi@email.com', 'agonista', '3.2', true),
('Laura', 'Bianchi', '3339876543', 'laura.bianchi@email.com', 'non_agonista', '4.1', true),
('Giuseppe', 'Verdi', '3335555555', 'giuseppe.verdi@email.com', 'frequentatore', NULL, true),
('Anna', 'Ferrari', '3337777777', 'anna.ferrari@email.com', 'agonista', '2.8', true),
('Roberto', 'Colombo', '3338888888', 'roberto.colombo@email.com', 'maestro', 'Istruttore', true);

-- Ospiti di esempio
INSERT INTO public.ospiti (nome, cognome, telefono, email) VALUES
('Mario', 'Gialli', '3332222222', 'mario.gialli@email.com'),
('Francesca', 'Neri', '3336666666', 'francesca.neri@email.com'),
('Alessandro', 'Blu', '3334444444', 'alessandro.blu@email.com');

-- Tariffe di esempio
INSERT INTO public.tariffe (nome, tipo_prenotazione, tipo_campo, diurno, soci, prezzo_ora, prezzo_mezz_ora) VALUES
('Soci Singolare Diurno Scoperto', 'singolare', 'scoperto', true, true, 25.00, 15.00),
('Soci Singolare Notturno Scoperto', 'singolare', 'scoperto', false, true, 30.00, 18.00),
('Soci Doppio Diurno Scoperto', 'doppio', 'scoperto', true, true, 35.00, 20.00),
('Ospiti Singolare Diurno Scoperto', 'singolare', 'scoperto', true, false, 35.00, 20.00),
('Ospiti Doppio Diurno Scoperto', 'doppio', 'scoperto', true, false, 45.00, 25.00),
('Soci Lezione Diurno Scoperto', 'lezione', 'scoperto', true, true, 40.00, 25.00);

-- Prenotazioni di esempio per questa settimana
INSERT INTO public.prenotazioni (socio_id, campo, data, ora_inizio, ora_fine, tipo_prenotazione, tipo_campo, diurno, importo, stato_pagamento, note) 
SELECT 
  s.id,
  1,
  CURRENT_DATE,
  '09:00'::time,
  '10:00'::time,
  'singolare'::tipo_prenotazione,
  'scoperto'::tipo_campo,
  true,
  25.00,
  'pagato'::stato_pagamento,
  'Prenotazione di esempio'
FROM public.soci s 
WHERE s.nome = 'Marco' AND s.cognome = 'Rossi'
LIMIT 1;

INSERT INTO public.prenotazioni (socio_id, campo, data, ora_inizio, ora_fine, tipo_prenotazione, tipo_campo, diurno, importo, stato_pagamento) 
SELECT 
  s.id,
  2,
  CURRENT_DATE,
  '10:00'::time,
  '11:00'::time,
  'doppio'::tipo_prenotazione,
  'scoperto'::tipo_campo,
  true,
  35.00,
  'da_pagare'::stato_pagamento
FROM public.soci s 
WHERE s.nome = 'Laura' AND s.cognome = 'Bianchi'
LIMIT 1;

INSERT INTO public.prenotazioni (ospite_id, campo, data, ora_inizio, ora_fine, tipo_prenotazione, tipo_campo, diurno, importo, stato_pagamento) 
SELECT 
  o.id,
  1,
  CURRENT_DATE + 1,
  '15:00'::time,
  '16:00'::time,
  'singolare'::tipo_prenotazione,
  'scoperto'::tipo_campo,
  true,
  35.00,
  'da_pagare'::stato_pagamento
FROM public.ospiti o 
WHERE o.nome = 'Mario' AND o.cognome = 'Gialli'
LIMIT 1;

-- Pagamenti di esempio (alcuni in contanti, altri con POS)
INSERT INTO public.pagamenti (prenotazione_id, importo, metodo_pagamento_tipo, metodo_pagamento, note)
SELECT 
  p.id,
  p.importo,
  'contanti',
  'Contanti',
  'Pagamento in contanti alla reception'
FROM public.prenotazioni p 
WHERE p.stato_pagamento = 'pagato'::stato_pagamento
LIMIT 1;