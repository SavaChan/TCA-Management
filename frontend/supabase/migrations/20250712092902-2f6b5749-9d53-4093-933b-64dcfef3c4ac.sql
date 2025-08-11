-- Rimuovi i duplicati manualmente
-- Mantieni solo la prenotazione del campo 1 alle 10:00 (la prima)
DELETE FROM prenotazioni WHERE id = '117fd75d-8fd9-4ac6-950e-e71cab8cb874'; -- campo 1 ore 11:00
DELETE FROM prenotazioni WHERE id = 'f97a97b9-e31b-4285-97c0-d9ee6bd98c72'; -- campo 1 ore 14:00  
DELETE FROM prenotazioni WHERE id = '912c6e27-73cc-4a5f-96d8-318bbed513e5'; -- campo 2 ore 14:00