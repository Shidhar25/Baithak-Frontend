export default function Header({ subtitle = 'Manual scheduling' }) {
  return (
    <header className="mb-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Baithak Assignments</h1>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        <nav className="text-sm space-x-3">
          <a href="/female" className="text-indigo-700 hover:underline">Female</a>
          <a href="/male" className="text-indigo-700 hover:underline">Male</a>
          <a href="#history" className="text-indigo-700 hover:underline">History</a>
        </nav>
      </div>
    </header>
  );
}

