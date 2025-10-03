import { useState, useEffect } from 'react';
import { API, fetchJSON, getDefaultDateRange, formatIsoDate, dateToInputValue } from '../api';

export default function AdvancedHistory({ persons, places }) {
  const [historyType, setHistoryType] = useState('general'); // 'general', 'person', 'place'
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTimeSlot, setFilterTimeSlot] = useState('');

  const filteredHistoryData = historyData.filter(item => {
    const matchesSearch = searchTerm === '' || 
      (item.personName && item.personName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.placeName && item.placeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (getPersonName(item.personId).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (getPlaceName(item.placeId).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTimeSlot = filterTimeSlot === '' || item.timeSlot === filterTimeSlot;
    
    return matchesSearch && matchesTimeSlot;
  });

  const loadHistory = async () => {
    if (!dateRange.fromDate || !dateRange.toDate) {
      setError('Please select both from and to dates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let url;
      const fromDateTime = dateRange.fromDate;
      const toDateTime = dateRange.toDate;

      switch (historyType) {
        case 'general':
          url = API.assignmentHistory(fromDateTime, toDateTime);
          break;
        case 'person':
          if (!selectedPersonId) {
            setError('Please select a person');
            return;
          }
          url = API.assignmentHistoryByPerson(selectedPersonId, fromDateTime, toDateTime);
          break;
        case 'place':
          if (!selectedPlaceId) {
            setError('Please select a place');
            return;
          }
          url = API.assignmentHistoryByPlace(selectedPlaceId, fromDateTime, toDateTime);
          break;
        default:
          setError('Invalid history type');
          return;
      }

      const data = await fetchJSON(url);
      setHistoryData(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(`Failed to load history: ${err.message}`);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (historyType === 'person') {
      setSelectedPlaceId('');
    } else if (historyType === 'place') {
      setSelectedPersonId('');
    }
  }, [historyType]);

  const getPersonName = (personId) => {
    const person = persons.find(p => p.personId === personId);
    return person ? person.name : 'Unknown';
  };

  const getPlaceName = (placeId) => {
    const place = places.find(p => p.placeId === placeId);
    return place ? place.name : 'Unknown';
  };

  const exportToCSV = () => {
    if (filteredHistoryData.length === 0) return;
    
    const headers = ['Date', 'Day', 'Person', 'Place', 'Time Slot', 'Assignment ID'];
    const csvContent = [
      headers.join(','),
      ...filteredHistoryData.map(item => [
        item.meetingDate,
        item.meetingDay || '',
        historyType === 'place' ? item.personName : getPersonName(item.personId),
        historyType === 'person' ? item.placeName : getPlaceName(item.placeId),
        item.timeSlot || '',
        item.assignmentId || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assignment_history_${historyType}_${dateRange.fromDate}_to_${dateRange.toDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Advanced History</h2>
      
      {/* History Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">History Type</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="general"
              checked={historyType === 'general'}
              onChange={(e) => setHistoryType(e.target.value)}
              className="mr-2"
            />
            General History
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="person"
              checked={historyType === 'person'}
              onChange={(e) => setHistoryType(e.target.value)}
              className="mr-2"
            />
            By Person
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="place"
              checked={historyType === 'place'}
              onChange={(e) => setHistoryType(e.target.value)}
              className="mr-2"
            />
            By Place
          </label>
        </div>
      </div>

      {/* Person Selection */}
      {historyType === 'person' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Person</label>
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a person...</option>
            {persons.map(person => (
              <option key={person.personId} value={person.personId}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Place Selection */}
      {historyType === 'place' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Place</label>
          <select
            value={selectedPlaceId}
            onChange={(e) => setSelectedPlaceId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a place...</option>
            {places.map(place => (
              <option key={place.placeId} value={place.placeId}>
                {place.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date Range Selection */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
          <input
            type="date"
            value={dateRange.fromDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
          <input
            type="date"
            value={dateRange.toDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const today = new Date();
              const lastWeek = new Date(today);
              lastWeek.setDate(today.getDate() - 7);
              setDateRange({
                fromDate: dateToInputValue(lastWeek),
                toDate: dateToInputValue(today)
              });
            }}
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded border"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const lastMonth = new Date(today);
              lastMonth.setDate(today.getDate() - 30);
              setDateRange({
                fromDate: dateToInputValue(lastMonth),
                toDate: dateToInputValue(today)
              });
            }}
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded border"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const lastQuarter = new Date(today);
              lastQuarter.setDate(today.getDate() - 90);
              setDateRange({
                fromDate: dateToInputValue(lastQuarter),
                toDate: dateToInputValue(today)
              });
            }}
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded border"
          >
            Last 90 Days
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const startOfYear = new Date(today.getFullYear(), 0, 1);
              setDateRange({
                fromDate: dateToInputValue(startOfYear),
                toDate: dateToInputValue(today)
              });
            }}
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded border"
          >
            This Year
          </button>
        </div>
      </div>

      {/* Load Button */}
      <button
        onClick={loadHistory}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {loading ? 'Loading...' : 'Load History'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* History Results */}
      {historyData.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium">History Results ({filteredHistoryData.length} of {historyData.length} entries)</h3>
            <button
              onClick={exportToCSV}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm"
            >
              Export to CSV
            </button>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by person or place name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Time Slot</label>
              <select
                value={filterTimeSlot}
                onChange={(e) => setFilterTimeSlot(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Time Slots</option>
                <option value="स ७:४५ ते १०:३०">स ७:४५ ते १०:३०</option>
                <option value="सकाळ">सकाळ</option>
                <option value="दुपार">दुपार</option>
                <option value="रात्री ७:४५ ते १०:३०">रात्री ७:४५ ते १०:३०</option>
              </select>
            </div>
          </div>
          
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredHistoryData.length}</div>
              <div className="text-sm text-gray-600">Filtered Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {new Set(filteredHistoryData.map(item => item.personId || item.personName)).size}
              </div>
              <div className="text-sm text-gray-600">Unique People</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(filteredHistoryData.map(item => item.placeId || item.placeName)).size}
              </div>
              <div className="text-sm text-gray-600">Unique Places</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {new Set(filteredHistoryData.map(item => item.meetingDate)).size}
              </div>
              <div className="text-sm text-gray-600">Unique Dates</div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-4 text-left">Date</th>
                  <th className="py-2 px-4 text-left">Day</th>
                  <th className="py-2 px-4 text-left">Person</th>
                  <th className="py-2 px-4 text-left">Place</th>
                  <th className="py-2 px-4 text-left">Time Slot</th>
                  <th className="py-2 px-4 text-left">Assignment ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryData.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 px-4">{formatIsoDate(item.meetingDate)}</td>
                    <td className="py-2 px-4">{item.meetingDay || '-'}</td>
                    <td className="py-2 px-4">
                      {historyType === 'place' ? item.personName : getPersonName(item.personId)}
                    </td>
                    <td className="py-2 px-4">
                      {historyType === 'person' ? item.placeName : getPlaceName(item.placeId)}
                    </td>
                    <td className="py-2 px-4">{item.timeSlot || '-'}</td>
                    <td className="py-2 px-4 text-xs text-gray-500">{item.assignmentId || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && historyData.length === 0 && !error && (
        <div className="text-center text-gray-500 py-8">
          No history data to display. Select criteria and click "Load History" to see results.
        </div>
      )}

      {!loading && historyData.length > 0 && filteredHistoryData.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No results match your current search and filter criteria. Try adjusting your search terms or filters.
        </div>
      )}
    </div>
  );
}
