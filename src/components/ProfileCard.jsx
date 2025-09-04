export default function ProfileCard({ person, onRefresh }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Profile</h2>
        <button
          onClick={onRefresh}
          className="text-sm border px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50"
          disabled={!person}
        >
          Refresh
        </button>
      </div>
      <div className="mt-3 text-sm text-gray-700" id="profile">
        {!person ? (
          <div className="italic text-gray-500">Choose a representative to load profile…</div>
        ) : (
          <div className="space-y-1">
            <div>
              <span className="font-medium">Name:</span> {person.name}
            </div>
            <div>
              <span className="font-medium">Gender:</span> {person.gender}
            </div>
            <div>
              <span className="font-medium">Person ID:</span> {person.personId}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

