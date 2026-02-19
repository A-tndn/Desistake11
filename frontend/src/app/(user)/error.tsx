'use client';

export default function UserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-red-700 font-bold text-lg mb-2">Something went wrong</h2>
        <p className="text-sm text-red-600 mb-3">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
