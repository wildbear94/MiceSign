export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <span className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          MiceSign
        </span>
        <div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    </div>
  );
}
