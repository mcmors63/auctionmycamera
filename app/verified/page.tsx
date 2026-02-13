"use client";

import { useEffect, useState } from "react";
import { Client, Account } from "appwrite";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function VerifiedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const uid = searchParams.get("userId");
    const sec = searchParams.get("secret");

    if (!uid || !sec) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    const verify = async () => {
      try {
        await account.updateVerification(uid, sec);
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      } catch (err: any) {
        setStatus("error");
        setMessage("Verification failed or expired.");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        {status === "verifying" && (
          <p className="text-gray-700">Verifying...</p>
        )}

        {status === "success" && (
          <>
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Email Verified</h1>
            <p className="text-gray-700 mb-6">{message}</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-md"
            >
              Go to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Verification Failed</h1>
            <p className="text-gray-700 mb-6">{message}</p>
            <button
              onClick={() => router.push("/resend-verification")}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-md"
            >
              Resend Verification
            </button>
          </>
        )}
      </div>
    </div>
  );
}
