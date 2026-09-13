# FamilyRoots deployment

## Recommended production setup

- MongoDB Atlas for MongoDB
- Cloudinary for image storage
- Brevo for transactional email (HTTPS API, no domain required)
- Render Web Service for the Express API
- Render Static Site for the React/Vite frontend

The frontend and backend run on Render as separate services with separate
URLs, for example:

- Backend: `https://familyroots-api.onrender.com`
- Frontend: `https://familyroots-frontend.onrender.com`

Render does not provide a built-in path rewrite/proxy feature like Vercel's
`vercel.json`, so the browser calls the backend URL directly.

CORS must therefore explicitly allow the frontend's origin.

`client/vercel.json` is not used when the frontend is deployed as a Render
Static Site. It can be ignored or deleted.

---

## 1. Deploy the API on Render (Web Service)

Create a Render Web Service from this repository.

If using the included `render.yaml`, set the service root directory to:

```text
server