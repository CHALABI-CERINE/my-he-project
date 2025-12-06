# My HE Project

A Homomorphic Encryption (HE) project using CKKS scheme with React frontend and Node.js backend.

## Project Structure

```
.
├── frontend/          # React + Vite frontend
├── backend/           # Node.js backend API
├── simulator/         # HE simulator
└── data/             # Data files
```

## Frontend Hosting

The frontend is configured to be hosted on GitHub Pages at:
`https://chalabi-cerine.github.io/my-he-project/`

### Automatic Deployment

The frontend automatically deploys to GitHub Pages when changes are pushed to the `master` branch via GitHub Actions workflow (`.github/workflows/static.yml`).

### Manual Build and Deploy

To build the frontend locally:

```bash
cd frontend
npm install
npm run build
```

The built files will be in `frontend/dist/` directory.

### Local Development

To run the frontend in development mode:

```bash
cd frontend
npm install
npm run dev
```

To preview the production build locally:

```bash
cd frontend
npm run build
npm run preview
```

## Backend Hosting

The backend is deployed to Azure Web Services at:
`https://sandbocckks-geh8d6b8fwbudzgm.francecentral-01.azurewebsites.net/`

The backend automatically deploys when changes are pushed to the `master` branch via GitHub Actions workflow (`.github/workflows/master_sandbocckks.yml`).

## Configuration

### Frontend Configuration

- **Base URL**: Configured in `frontend/vite.config.js` as `/my-he-project/`
- **API URL**: Configured in `frontend/.env.production` pointing to the Azure backend

### Backend Configuration

The backend is configured to run on Azure Web Services with Node.js 20.x runtime.

## Technologies

- **Frontend**: React, Vite, node-seal (CKKS)
- **Backend**: Node.js, Express
- **Deployment**: GitHub Pages (frontend), Azure Web Services (backend)

## Requirements

- Node.js 20.x
- npm

## License

All rights reserved.
