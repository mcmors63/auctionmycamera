// app/admin/auction-manager/page.tsx

export const metadata = {
  title: "Auction Manager | Admin | AuctionMyPlate",
};

export default function AdminAuctionManagerPage() {
  return (
    <main className="min-h-screen bg-yellow-50 py-10 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-yellow-700 mb-4">
          Auction Manager
        </h1>

        <p className="text-gray-700">
          This section will be used to manage weekly auction windows and
          system-level auction settings.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          For now, all key actions (approving listings, marking as sold,
          managing transactions) are handled on the main Admin Dashboard.
        </p>
      </div>
    </main>
  );
}
