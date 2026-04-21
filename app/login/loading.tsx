export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-900/20 via-[#1a1408] to-[#1a1408]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="text-white">Loading...</p>
      </div>
    </div>
  );
}
