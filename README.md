# Rozliczenia — System rozliczania wspólnych wydatków

Aplikacja webowa do rozliczania wydatków między Mateuszem, Janem i Wojciechem z automatyczną waloryzacją inflacyjną CPI m/m.

**Stack:** FastAPI + PostgreSQL + React + Tailwind CSS  
**Deployment:** Railway (backend) + Vercel (frontend)

---

## Lokalne uruchomienie

### Wymagania

- Python 3.11+
- Node.js 18+
- (opcjonalnie) PostgreSQL; domyślnie używa SQLite

### Backend

```bash
cd backend

# Utwórz środowisko wirtualne
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Zainstaluj zależności
pip install -r requirements.txt

# Skopiuj i uzupełnij zmienne środowiskowe
cp .env.example .env
# Edytuj .env — zmień APP_PASSWORD i ewentualnie DATABASE_URL

# Uruchom serwer
uvicorn app.main:app --reload --port 8000
```

Dokumentacja API (Swagger): http://localhost:8000/docs

### Frontend

```bash
cd frontend

npm install

# Ustaw adres API (opcjonalne — vite proxy domyślnie przekieruje na :8000)
# Skopiuj do .env.local:
# VITE_API_URL=http://localhost:8000

npm run dev
```

Aplikacja: http://localhost:5173  
Login: `admin` / hasło z `APP_PASSWORD` w `.env`

---

## Deployment na Railway (backend + PostgreSQL)

### 1. Utwórz projekt na Railway

1. Zaloguj się na [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo** — wskaż repozytorium
3. Ustaw **Root Directory** na `backend`
4. Railway wykryje `railway.toml` i skonfiguruje build automatycznie

### 2. Dodaj bazę PostgreSQL

1. W projekcie kliknij **+ New → Database → PostgreSQL**
2. Railway automatycznie doda zmienną `DATABASE_URL` do serwisu backendowego
   (upewnij się, że serwis backend ma dostęp do tej zmiennej)

### 3. Ustaw zmienne środowiskowe backendowego serwisu

W zakładce **Variables** dodaj:

```
APP_PASSWORD=twoje_silne_haslo
SECRET_KEY=losowy_klucz_32_znaki
CORS_ORIGINS=https://twoja-aplikacja.vercel.app
INFLACJA_AUTO_REFRESH=true
BACKUP_ENABLED=true
```

### 4. Deploy

Railway automatycznie zbuduje i uruchomi aplikację po push do repozytorium.  
Endpoint healthcheck: `GET /api/health`

---

## Deployment frontendu na Vercel

### 1. Utwórz projekt na Vercel

1. Zaloguj się na [vercel.com](https://vercel.com)
2. **New Project → Import Git Repository** — wskaż repozytorium
3. Ustaw **Root Directory** na `frontend`
4. Vercel wykryje `vite` i skonfiguruje build automatycznie

### 2. Ustaw zmienną środowiskową

W zakładce **Environment Variables** dodaj:

```
VITE_API_URL=https://twoj-backend.railway.app
```

(adres backendu z Railway — znajdziesz go w Settings → Domains)

### 3. Dodaj domenę Railway do CORS

W zmiennych backendu (Railway) zaktualizuj:
```
CORS_ORIGINS=https://twoja-aplikacja.vercel.app
```

### 4. Deploy

Vercel automatycznie wdroży po każdym push do repozytorium.

---

## Logika obliczeń

Implementacja wiernie odwzorowuje makro VBA `RozliczeniaFIFO_DziennikSplaty`:

1. **Waloryzacja inflacyjna** — dla każdego wydatku mnożona jest suma udziałów przez skumulowany CPI m/m od miesiąca wydatku do bieżącego miesiąca (zakres: `>= data_wydatku AND <= aktualny_miesiac`). Brakujące miesiące traktowane jako 0%.

2. **Macierz FIFO** — `fifoSaldo[dłużnik][wierzyciel]` = suma zwaloryzowanych udziałów dłużnika w fakturach wierzyciela.

3. **Spłaty FIFO** — spłaty przetwarzane chronologicznie. Każda spłata redukuje długi wobec wierzycieli w kolejności: Mateusz (0) → Jan (1) → Wojciech (2). Nie wskazuje się odbiorcy wpłaty — system rozdziela automatycznie.

4. **Netowanie** — jeśli A winien B i B winien A, zostaje tylko różnica w jednym kierunku.

### Tabela Spłaty

Pola: `id | data | kto | kwota` — brak pola `komu`, ponieważ spłaty są rozdzielane automatycznie przez logikę FIFO (tak jak w oryginale VBA).

---

## Struktura projektu

```
rozliczenia-app/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, scheduler, lifespan
│   │   ├── config.py        # Konfiguracja (pydantic-settings)
│   │   ├── database.py      # SQLAlchemy setup
│   │   ├── models.py        # Modele ORM
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── auth.py          # HTTP Basic Auth
│   │   ├── routers/         # Endpointy API
│   │   └── services/
│   │       ├── obliczenia.py        # Logika FIFO (odpowiednik VBA)
│   │       ├── inflacja_scraper.py  # Scraper GUS BDL API
│   │       └── backup.py            # Backup PostgreSQL/SQLite
│   ├── requirements.txt
│   ├── railway.toml
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/           # Dashboard, Wydatki, Spłaty, Rozliczenia, Inflacja
    │   ├── components/      # Layout, Modal
    │   ├── api/client.js    # Axios + interceptory auth
    │   └── utils/format.js  # Formatowanie kwot, dat
    ├── package.json
    ├── vite.config.js
    └── vercel.json
```

---

## Zmienne środowiskowe

| Zmienna | Opis | Przykład |
|---------|------|---------|
| `DATABASE_URL` | Connection string bazy danych | `postgresql://user:pass@host:5432/db` |
| `APP_PASSWORD` | Hasło logowania (login: `admin`) | `silne_haslo_123` |
| `SECRET_KEY` | Klucz tajny aplikacji | `losowy-32-znakowy-string` |
| `CORS_ORIGINS` | Dozwolone origins frontendu | `https://app.vercel.app` |
| `INFLACJA_AUTO_REFRESH` | Auto-pobieranie CPI raz dziennie | `true` |
| `BACKUP_ENABLED` | Auto-backup bazy raz dziennie | `true` |

---

## API — skrócony przegląd

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/wydatki` | Lista wydatków |
| POST | `/api/wydatki` | Dodaj wydatek |
| PUT | `/api/wydatki/{id}` | Edytuj wydatek |
| DELETE | `/api/wydatki/{id}` | Usuń wydatek |
| GET | `/api/splaty` | Lista spłat |
| POST | `/api/splaty` | Dodaj spłatę |
| GET | `/api/inflacja` | Lista danych CPI |
| POST | `/api/inflacja` | Dodaj/edytuj CPI |
| POST | `/api/inflacja/odswiez` | Pobierz dane z GUS |
| GET | `/api/przelicz` | Pełne przeliczenie FIFO |
| GET | `/api/eksport/csv` | Eksport do CSV |
| GET | `/api/eksport/xlsx` | Eksport do XLSX |
| POST | `/api/import/xlsx` | Import z XLSX |
| GET | `/api/health` | Health check |

Wszystkie endpointy wymagają HTTP Basic Auth: `admin:{APP_PASSWORD}`.
