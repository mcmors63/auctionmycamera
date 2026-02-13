// app/login-or-register/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Login or Register | AuctionMyPlate",
  description: "Login or create an account to bid or sell plates.",
};

export default function LoginOrRegisterPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 text-gray-100">
      <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-lg border border-yellow-700/60 p-6 text-center space-y-4">
        <h1 className="text-2xl font-extrabold text-yellow-400">
          You need an account
        </h1>

        <p className="text-sm text-gray-300">
          To <strong>bid</strong> or <strong>sell a plate</strong>, you must be
          logged in to your AuctionMyPlate account.
        </p>

        <div className="flex flex-col gap-3 mt-4">
          <Link
            href="/login"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 rounded-md text-sm transition-colors"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="w-full border border-yellow-500 text-yellow-300 hover:bg-yellow-500/10 font-semibold py-2 rounded-md text-sm transition-colors"
          >
            Register as a new seller
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Once logged in, you can access your{" "}
          <strong>Seller Dashboard</strong>, list plates, and place bids.
        </p>

        <p className="mt-2 text-[11px] text-gray-500">
          Or{" "}
          <Link href="/" className="text-yellow-400 underline hover:text-yellow-300">
            return to the homepage
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
