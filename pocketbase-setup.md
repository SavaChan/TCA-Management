# Setup PocketBase come alternativa locale a Supabase

## Installazione PocketBase

1. **Scarica PocketBase** da https://pocketbase.io/docs/
2. **Estrai il file** in una cartella del progetto (es. `./pocketbase/`)
3. **Avvia PocketBase**:
   ```bash
   cd pocketbase
   ./pocketbase serve
   ```
4. **Apri l'admin UI** su http://localhost:8090/_/

## Configurazione Database

### 1. Crea le Collections (Tabelle)

#### Collection: soci
```json
{
  "name": "soci",
  "fields": [
    {"name": "nome", "type": "text", "required": true},
    {"name": "cognome", "type": "text", "required": true},
    {"name": "email", "type": "email"},
    {"name": "telefono", "type": "text"},
    {"name": "tipo_socio", "type": "select", "options": ["ordinario", "giovane", "onorario"]},
    {"name": "certificato_medico_scadenza", "type": "date"},
    {"name": "classifica_fitp", "type": "text"},
    {"name": "note", "type": "text"},
    {"name": "attivo", "type": "bool", "default": true}
  ]
}
```

#### Collection: ospiti
```json
{
  "name": "ospiti",
  "fields": [
    {"name": "nome", "type": "text", "required": true},
    {"name": "cognome", "type": "text", "required": true},
    {"name": "email", "type": "email"},
    {"name": "telefono", "type": "text"},
    {"name": "note", "type": "text"}
  ]
}
```

#### Collection: tariffe
```json
{
  "name": "tariffe",
  "fields": [
    {"name": "nome", "type": "text", "required": true},
    {"name": "tipo_campo", "type": "select", "options": ["terra_battuta", "cemento", "erba"]},
    {"name": "tipo_prenotazione", "type": "select", "options": ["singolo", "doppio", "lezione"]},
    {"name": "soci", "type": "bool", "default": true},
    {"name": "diurno", "type": "bool", "default": true},
    {"name": "prezzo_ora", "type": "number", "required": true},
    {"name": "prezzo_mezz_ora", "type": "number", "required": true},
    {"name": "attivo", "type": "bool", "default": true}
  ]
}
```

#### Collection: prenotazioni
```json
{
  "name": "prenotazioni",
  "fields": [
    {"name": "data", "type": "date", "required": true},
    {"name": "ora_inizio", "type": "text", "required": true},
    {"name": "ora_fine", "type": "text", "required": true},
    {"name": "campo", "type": "number", "required": true},
    {"name": "socio_id", "type": "relation", "collection": "soci"},
    {"name": "ospite_id", "type": "relation", "collection": "ospiti"},
    {"name": "tipo_campo", "type": "select", "options": ["terra_battuta", "cemento", "erba"]},
    {"name": "tipo_prenotazione", "type": "select", "options": ["singolo", "doppio", "lezione"]},
    {"name": "diurno", "type": "bool", "required": true},
    {"name": "importo", "type": "number", "required": true},
    {"name": "stato_pagamento", "type": "select", "options": ["da_pagare", "pagato"], "default": "da_pagare"},
    {"name": "note", "type": "text"}
  ]
}
```

#### Collection: pagamenti
```json
{
  "name": "pagamenti",
  "fields": [
    {"name": "prenotazione_id", "type": "relation", "collection": "prenotazioni", "required": true},
    {"name": "importo", "type": "number", "required": true},
    {"name": "data_pagamento", "type": "datetime", "required": true},
    {"name": "metodo_pagamento", "type": "select", "options": ["contanti", "carta", "bonifico", "altro"]},
    {"name": "metodo_pagamento_tipo", "type": "text"},
    {"name": "note", "type": "text"}
  ]
}
```

## Configurazione Applicazione

### 1. Aggiungi variabile d'ambiente
Crea un file `.env.local`:
```
VITE_DB_PROVIDER=pocketbase
```

### 2. Per usare Supabase (default)
Rimuovi o commenta la variabile:
```
# VITE_DB_PROVIDER=supabase
```

## Vantaggi di PocketBase

✅ **Locale**: Nessuna dipendenza da servizi esterni
✅ **Leggero**: Un singolo binario (~10MB)
✅ **API REST**: Interfaccia semplice e standard
✅ **Admin UI**: Interfaccia web per gestire i dati
✅ **Realtime**: Supporta WebSocket per aggiornamenti in tempo reale
✅ **File Upload**: Sistema di storage integrato
✅ **Auth**: Sistema di autenticazione completo

## Script di Migrazione

Per migrare i dati da Supabase a PocketBase, puoi usare questo script:

```typescript
// migrate-to-pocketbase.ts
import { supabase } from '@/integrations/supabase/client';

const POCKETBASE_URL = 'http://localhost:8090';

async function migrateToPocketBase() {
  // Migrare soci
  const { data: soci } = await supabase.from('soci').select('*');
  for (const socio of soci || []) {
    await fetch(`${POCKETBASE_URL}/api/collections/soci/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(socio)
    });
  }
  
  // Ripetere per ospiti, tariffe, prenotazioni, pagamenti...
  console.log('Migrazione completata!');
}
```

## Comandi utili

```bash
# Avvia PocketBase
./pocketbase serve

# Avvia con porta personalizzata
./pocketbase serve --http=0.0.0.0:8080

# Backup del database
./pocketbase backup

# Ripristino backup
./pocketbase restore backup.zip
```