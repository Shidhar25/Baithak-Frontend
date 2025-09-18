import { formatIsoDate } from '../api';
import { isInputDateInCurrentWeek, isInputDateInEditableWindow } from '../api';

export default function HistoryTable({ rows, onEditDate, onEditPerson, persons = [], dateMin, dateMax }) {
  const hasRows = Array.isArray(rows) && rows.length > 0;
  const ordered = hasRows ? [...rows].reverse() : [];
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold mb-3">Last 10 Meetings (oldest → newest)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-4 text-left">Date</th>
              <th className="py-2 px-4 text-left">Day</th>
              <th className="py-2 px-4 text-left">Place</th>
              <th className="py-2 px-4 text-left">Time Slot</th>
              <th className="py-2 px-4 text-left">Edit Date</th>
              <th className="py-2 px-4 text-left">Edit Person</th>
            </tr>
          </thead>
          <tbody>
            {!hasRows ? (
              <tr>
                <td colSpan={6} className="py-3 text-gray-500 italic px-4">No history yet</td>
              </tr>
            ) : (
              ordered.map((r, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 pr-4 px-4">{formatIsoDate(r.meetingDate)}</td>
                  <td className="py-2 pr-4 px-4">{r.meetingDay}</td>
                  <td className="py-2 pr-4 px-4">{r.placeName || '-'}</td>
                  <td className="py-2 pr-4 px-4">{r.timeSlot || '-'}</td>
                  <td className="py-2 pr-4 px-4">
                    {r.assignmentId ? (
                      <input
                        type="date"
                        defaultValue={r.meetingDate}
                        min={dateMin}
                        max={dateMax}
                        className="border rounded px-2 py-1 text-xs"
                        onChange={(e) => onEditDate && onEditDate(r.assignmentId, e.target.value)}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 px-4">
                    {r.assignmentId ? (
                      isInputDateInEditableWindow(r.meetingDate) ? (
                        <select
                          className="border rounded px-2 py-1 text-xs"
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            onEditPerson && onEditPerson(r.assignmentId, val);
                            e.target.value = '';
                          }}
                        >
                          <option value="">Change person…</option>
                          {(persons || []).map(p => (
                            <option key={p.personId} value={p.personId}>{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400 text-xs">Only last/current/next week can change</span>
                      )
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

