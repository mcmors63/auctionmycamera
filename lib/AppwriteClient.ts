// /lib/AppwriteClient.ts
import { Client, Account, Databases, ID } from "appwrite";

// Create client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// ✅ Export initialized services
export const account = new Account(client);
export const databases = new Databases(client);
export { ID };
export default client;
