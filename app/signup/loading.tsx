export default function SignupLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-900/20 via-black to-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-white">Loading...</p>
      </div>
    </div>
  );
}
