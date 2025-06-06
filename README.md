# Thrifta Admin Dashboard

A minimal React + Vite + Tailwind dashboard that connects to Firebase and shows:

* Total number of users  
* Users with `thrifta_pro`, `thrifta_premium`, `thrifta_premium_plus` entitlements  
* Total products listed  
* Products where `sold === true`

## Quick Start

```bash
git clone <your‑repo‑url>
cd thrifta-dashboard
npm install
cp .env.example .env   # add your Firebase keys
npm run dev
```

## Assumptions

* Firestore collection **users** has a string field `entitlement`.
* Firestore collection **products** has a boolean field `sold`.

Feel free to tweak the queries in `src/App.jsx` if your schema differs.