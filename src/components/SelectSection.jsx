import { useMemo } from 'react';
import { weekdayFromDate } from '../api';

export default function SelectSection({
  persons,
  places,
  currentHistory,
  selectedPersonId,
  onSelectPerson,
  dateValue,
  onChangeDate,
  onAssign,
  placeValue,
  onChangePlace,
  derivedDayLabel,
  choosePersonPlaceholder = '-- choose female representative --',
  choosePlacePlaceholder = '-- choose female place --',
  dateMin,
  dateMax,
  buttonClass = 'bg-indigo-600 hover:bg-indigo-700',
}) {
  const assignedIds = useMemo(() => new Set((currentHistory || []).map(h => h.placeId)), [currentHistory]);
  const selectedWeekday = useMemo(() => (dateValue ? weekdayFromDate(dateValue) : null), [dateValue]);
  const availablePlaces = useMemo(() => {
    return (places || []).filter(pl => {
      if (assignedIds.has(pl.placeId)) return false;
      if (selectedWeekday && pl?.meetingDay && pl.meetingDay !== selectedWeekday) return false;
      return true;
    });
  }, [places, assignedIds, selectedWeekday]);

  return (
    <section className="md:col-span-1 space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-2">Select Representative</h2>
        <select
          className="w-full border rounded px-3 py-2"
          value={selectedPersonId || ''}
          onChange={(e) => onSelectPerson(e.target.value)}
        >
          <option value="">{choosePersonPlaceholder}</option>
          {(persons || []).map(p => (
            <option key={p.personId} value={p.personId}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-2">Assign Meeting</h2>

        <label className="text-sm block mb-1" htmlFor="dateInput">Date</label>
        <input
          id="dateInput"
          type="date"
          className="w-full border rounded px-3 py-2 mb-3"
          value={dateValue}
          onChange={(e) => onChangeDate(e.target.value)}
          min={dateMin}
          max={dateMax}
        />
        <p className="text-gray-600 text-sm italic">{derivedDayLabel}</p>

        <label className="text-sm block mb-1" htmlFor="placeSelect">Place</label>
        <select
          id="placeSelect"
          className="w-full border rounded px-3 py-2 mb-4"
          value={placeValue}
          onChange={(e) => onChangePlace(e.target.value)}
        >
          <option value="">{choosePlacePlaceholder}</option>
          {availablePlaces.map(pl => (
            <option key={pl.placeId} value={pl.placeId}>
              {pl.name} — {pl.meetingDay} ({pl.timeSlot})
            </option>
          ))}
        </select>

        <button
          onClick={onAssign}
          className={`w-full ${buttonClass} text-white font-medium px-4 py-2 rounded`}
        >
          Assign
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-2">Tips</h2>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>History shows last 10 (oldest → newest).</li>
          <li>Choose an exact date; day label is auto-filled on backend.</li>
          <li>No auto-rotation — you’re in control.</li>
        </ul>
      </div>
    </section>
  );
}

