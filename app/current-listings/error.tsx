'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-6">
      <h1 className="text-3xl font-bold text-red-600 mb-3">
        Oops, something went wrong
      </h1>
      <p className="text-gray-700 mb-6">
        {error.message || 'We hit a problem loading this page.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
