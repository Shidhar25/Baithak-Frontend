import { formatIsoDate } from '../api';
import { isInputDateInCurrentWeek, isInputDateInEditableWindow } from '../api';

export default function PlacesGrid({ overview, persons = [], dateMin, dateMax, onEditDate, onEditPerson }) {
  const items = Array.isArray(overview) ? overview : [];
  return (
    <div>
      <h2 className="text-lg font-semibold mt-6">Places Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4" id="placesGrid">
        {items.map((p, idx) => (
          <div
            key={idx}
            className={`p-4 border rounded shadow-sm text-center ${((p && (p.personId || p.personName)) ? 'bg-red-100' : 'bg-green-100')}`}
          >
            <h3 className="font-bold">{p.placeName}</h3>
            <p className="text-sm">{p.meetingDay} — {p.timeSlot}</p>
            <p className="text-xs mt-2">{p.meetingDate ? formatIsoDate(p.meetingDate) : '-'}</p>
            <p className="text-xs">{(p && (p.personId || p.personName)) ? `Assigned${p.personName ? `: ${p.personName}` : ''}` : 'Available'}</p>

            {(p && (p.personId || p.personName)) && (
              <div className="mt-3 space-y-2 text-left">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-gray-700">Change date</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-xs w-36"
                    defaultValue={p.meetingDate || ''}
                    min={dateMin}
                    max={dateMax}
                    onChange={(e) => onEditDate && onEditDate(p.assignmentId, e.target.value, p)}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-gray-700">Change person</label>
                  {isInputDateInEditableWindow(p.meetingDate) ? (
                    <select
                      className="border rounded px-2 py-1 text-xs w-full"
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        onEditPerson && onEditPerson(p.assignmentId, val, p);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Choose…</option>
                      {(persons || []).map(per => (
                        <option key={per.personId} value={per.personId}>{per.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-400 text-xs">Only last/current/next week can change</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500 italic">No places overview data</div>
        )}
      </div>
    </div>
  );
}

