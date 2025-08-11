# Sistema Gestione Tennis Club Arenzano

## Informazioni sul Progetto

Sistema di gestione per prenotazioni campi da tennis con funzionalità avanzate per il Tennis Club Arenzano.

**URL**: https://lovable.dev/projects/92c8897b-df2b-4fd6-b9ef-4a0d571ea71a

## Funzionalità Principali

- ✅ **Gestione Soci**: Registrazione e gestione completa dei soci del club
- ✅ **Gestione Ospiti**: Registrazione e gestione degli ospiti
- ✅ **Prenotazioni Campi**: Sistema avanzato per prenotazioni con:
  - Selezione multipla di slot orari (trascinamento mouse)
  - Prenotazioni ricorrenti per corsi e abbonamenti
  - Annullamento per pioggia con tracking storico
- ✅ **Tariffe Personalizzate**: Gestione tariffe differenziate per soci/ospiti, diurno/notturno
- ✅ **Pagamenti**: Tracking dei pagamenti con stati e storico
- ✅ **Meteo**: Integrazione con previsioni meteo per Arenzano-Genova
- ✅ **Report**: Report finanziari, insoluti, statistiche maestri
- ✅ **Dashboard**: Panoramica completa con statistiche e meteo

## Installazione Locale

### Prerequisiti
- Node.js (versione 18 o superiore)
- npm o yarn
- Git

### Passaggi di Installazione

1. **Clonare il repository**
```sh
git clone <URL_DEL_TUO_REPOSITORY>
cd tennis-club-arenzano
```

2. **Installare le dipendenze**
```sh
npm install
```

3. **Configurare il database**
Creare un file `.env.local` nella root del progetto:
```sh
VITE_SUPABASE_URL=https://teucgkjazfheknvybgnm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldWNna2phemZoZWtudnliZ25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDU1NTIsImV4cCI6MjA2NzIyMTU1Mn0.9zUVqW-6uLd7j2tWx-yEESD0NwWZkhcVJsA1m8jZsZs
```

4. **Avviare il server di sviluppo**
```sh
npm run dev
```

5. **Accedere all'applicazione**
Aprire il browser e visitare: `http://localhost:5173`

### Build per Produzione

```sh
npm run build
npm run preview
```

## Come Modificare il Codice

### Utilizzando Lovable (Consigliato)
Visita semplicemente il [Progetto Lovable](https://lovable.dev/projects/92c8897b-df2b-4fd6-b9ef-4a0d571ea71a) e inizia a scrivere le tue richieste.

Le modifiche fatte tramite Lovable vengono automaticamente committate in questo repository.

### Utilizzando il tuo IDE Preferito
Puoi clonare questo repo e pushare le modifiche. Le modifiche pushate si riflettono anche in Lovable.

### Modifica Diretta su GitHub
- Naviga ai file desiderati
- Clicca il pulsante "Edit" (icona matita) in alto a destra
- Fai le tue modifiche e committa

### Utilizzando GitHub Codespaces
- Vai alla pagina principale del repository
- Clicca sul pulsante "Code" (verde) in alto a destra
- Seleziona la tab "Codespaces"
- Clicca "New codespace" per lanciare un nuovo ambiente Codespace

## Tecnologie Utilizzate

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: Supabase Auth
- **Stato**: React Query (TanStack Query)
- **Form**: React Hook Form + Zod
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Date**: date-fns
- **Export**: jsPDF + xlsx

## Struttura del Progetto

```
src/
├── components/          # Componenti riutilizzabili
│   ├── ui/             # Componenti UI base (shadcn)
│   └── *.tsx           # Dialog e componenti specifici
├── hooks/              # Custom hooks
├── pages/              # Pagine dell'applicazione
├── lib/                # Utilità e configurazioni
├── types/              # Type definitions
└── integrations/       # Integrazioni esterne (Supabase)
```

## Deploy

### Deploy Automatico
Apri [Lovable](https://lovable.dev/projects/92c8897b-df2b-4fd6-b9ef-4a0d571ea71a) e clicca su Share -> Publish.

### Dominio Personalizzato
Per connettere un dominio personalizzato:
1. Vai su Project > Settings > Domains
2. Clicca "Connect Domain"
3. Segui le istruzioni

Leggi di più qui: [Configurazione dominio personalizzato](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Configurazione Database

Il progetto utilizza Supabase con le seguenti tabelle principali:
- `soci` - Gestione soci del club
- `ospiti` - Gestione ospiti
- `prenotazioni` - Prenotazioni campi con metadati avanzati
- `tariffe` - Sistema tariffe personalizzate
- `pagamenti` - Tracking pagamenti
- `profiles` - Profili utenti admin

## Supporto

Per problemi o domande, contatta il team di sviluppo o apri una issue su GitHub.
