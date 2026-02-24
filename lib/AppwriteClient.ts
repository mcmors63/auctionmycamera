// /lib/AppwriteClient.ts
import { Client, Account, Databases, ID } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

if (!endpoint || !projectId) {
  // This is a client-side module: fail loudly in the browser console.
  // (Better than a cryptic crash from non-null assertions.)
  // eslint-disable-next-line no-console
  console.error(
    "[AppwriteClient] Missing NEXT_PUBLIC_APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_PROJECT_ID. Check your .env.local / Vercel env vars."
  );
}

// Create client
const client = new Client();

if (endpoint) client.setEndpoint(endpoint);
if (projectId) client.setProject(projectId);

// ✅ Export initialized services
export const account = new Account(client);
export const databases = new Databases(client);

// Export ID helper
export { ID };

export default client;