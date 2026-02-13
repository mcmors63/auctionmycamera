"use client";

export default function SellPage() {
  // ✅ Helper function to calculate the upcoming auction times
  function getNextAuctionWindow() {
    const now = new Date();

    // Set to upcoming Sunday 00:00
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7)); // next Sunday
    nextSunday.setHours(0, 0, 0, 0);

    // End of auction = following Sunday 23:59
    const endSunday = new Date(nextSunday);
    endSunday.setDate(endSunday.getDate() + 7);
    endSunday.setHours(23, 59, 59, 999);

    return {
      auction_start: nextSunday.toISOString(),
      auction_end: endSunday.toISOString(),
    };
  }

  // ✅ Main submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const reg_number = formData.get("reg_number");
    const starting_price = formData.get("starting_price");
    const reserve_price = formData.get("reserve_price");
    const expiry_date = formData.get("expiry_date");
    const plate_status = formData.get("plate_status") || "available";

    if (!reg_number || !starting_price || !reserve_price) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }

    // ✅ Get next auction times
    const { auction_start, auction_end } = getNextAuctionWindow();

    // ✅ Build payload
    const payload = {
      reg_number,
      starting_price: Number(starting_price),
      reserve_price: Number(reserve_price),
      expiry_date,
      plate_status,
      owner_id: "demo-user",
      auction_start,
      auction_end,
    };

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert("❌ Error: " + data.error);
        return;
      }

      alert(
        `✅ Listing created successfully!\nAuction starts: ${new Date(
          auction_start
        ).toLocaleString()}\nEnds: ${new Date(auction_end).toLocaleString()}`
      );
    } catch (error) {
      console.error("Error submitting listing:", error);
      alert("❌ Failed to submit listing, please try again.");
    }
  };

  // ✅ Render Form
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Sell Your Plate</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Registration Number</label>
          <input
            name="reg_number"
            placeholder="e.g. AA11 AAA"
            className="border p-2 w-full rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Starting Price (£)</label>
          <input
            name="starting_price"
            type="number"
            placeholder="0"
            className="border p-2 w-full rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Reserve Price (£)</label>
          <input
            name="reserve_price"
            type="number"
            placeholder="0"
            className="border p-2 w-full rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Plate Status</label>
          <select name="plate_status" className="border p-2 w-full rounded">
            <option value="certificate">Certificate</option>
            <option value="vehicle">On Vehicle</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Expiry Date (if certificate)</label>
          <input
            name="expiry_date"
            type="date"
            className="border p-2 w-full rounded"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full"
        >
          Submit Listing
        </button>
      </form>
    </div>
  );
}
