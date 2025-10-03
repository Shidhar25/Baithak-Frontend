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
  overview = [], // Add overview data for comprehensive assignment filtering
}) {
  const selectedWeekday = useMemo(() => (dateValue ? weekdayFromDate(dateValue) : null), [dateValue]);

  const availablePlaces = useMemo(() => {
    return (places || []).filter(pl => {
      // Completely remove places that are assigned anywhere
      const isAssigned = overview.some(item => 
        item.placeId === pl.placeId && 
        (item.personId || item.personName)
      );
      
      // If place is assigned, exclude it entirely
      if (isAssigned) return false;
      
      // Filter by weekday if specified
      if (selectedWeekday && pl?.meetingDay && pl.meetingDay !== selectedWeekday) return false;
      
      return true;
    });
  }, [places, overview, selectedWeekday]);

  return (
    <section className="md:col-span-1 space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Representative</label>
            <select
              value={selectedPersonId}
              onChange={(e) => onSelectPerson(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{choosePersonPlaceholder}</option>
              {persons.map(p => (
                <option key={p.personId} value={p.personId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Select Date</label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => onChangeDate(e.target.value)}
              min={dateMin}
              max={dateMax}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {derivedDayLabel && <p className="text-xs text-gray-500 mt-1">{derivedDayLabel}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Select Place</label>
            <select
              value={placeValue}
              onChange={(e) => onChangePlace(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{choosePlacePlaceholder}</option>
              {availablePlaces.map(pl => (
                <option 
                  key={pl.placeId} 
                  value={pl.placeId}
                >
                  {pl.name} — {pl.meetingDay} ({pl.timeSlot})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {availablePlaces.length} available of {(places || []).length} total
            </p>
          </div>

          <button
            onClick={onAssign}
            className={`w-full ${buttonClass} text-white font-medium px-4 py-2 rounded`}
          >
            Assign
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-2">Tips</h2>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>Only unassigned places are shown.</li>
          <li>History shows last 10 (oldest → newest).</li>
          <li>Choose an exact date; day label is auto-filled on backend.</li>
          <li>No auto-rotation — you're in control.</li>
        </ul>
      </div>
    </section>
  );
}

