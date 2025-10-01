import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { API, fetchJSON, dateToInputValue } from '../api';

export default function ExcelExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [persons, setPersons] = useState([]);

  // Date range selection
  const todayStr = dateToInputValue(new Date());
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const weekdayNamesMr = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

  const { rangeStart, rangeEnd, dayDates } = useMemo(() => {
    const s = new Date(`${fromDate}T00:00:00`);
    const e = new Date(`${toDate}T00:00:00`);
    const start = s <= e ? s : e;
    const end = s <= e ? e : s;
    const days = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return { rangeStart: start, rangeEnd: end, dayDates: days };
  }, [fromDate, toDate]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      // Load all persons (male + female)
      const [females, males] = await Promise.all([
        fetchJSON(API.females),
        fetchJSON(API.males),
      ]);
      const allPersons = [
        ...(Array.isArray(females) ? females : []),
        ...(Array.isArray(males) ? males : []),
      ];
      setPersons(allPersons);

      // Load history for the selected range (inclusive)
      const data = await fetchJSON(API.assignmentHistory(fromDate, toDate));
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load data');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const personIdToName = (id) => {
    const p = persons.find(x => String(x.personId) === String(id));
    return p?.name || '';
  };

  const personIdToGender = (id) => {
    const p = persons.find(x => String(x.personId) === String(id));
    return p?.gender || '';
  };

  const formatDateDDMMYYYY = (isoDate) => {
    if (!isoDate) return '';
    const d = new Date(`${isoDate}T00:00:00`);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const personTables = useMemo(() => {
    // Build per-person tables for the current date range
    const tables = new Map();
    const inRange = (dStr) => {
      const d = new Date(`${dStr}T00:00:00`);
      return d >= rangeStart && d <= rangeEnd;
    };
    (history || []).forEach(item => {
      if (!inRange(item.meetingDate)) return;
      const personId = item.personId;
      const name = item.personName || personIdToName(personId);
      if (!name) return;
      const rows = tables.get(name) || [];
      rows.push({
        date: formatDateDDMMYYYY(item.meetingDate),
        weekday: weekdayNamesMr[new Date(`${item.meetingDate}T00:00:00`).getDay()],
        gender: personIdToGender(personId) === 'FEMALE' ? 'महिला' : 'पुरुष',
        place: item.placeName || '',
        timeSlot: item.timeSlot || '',
      });
      tables.set(name, rows);
    });
    // Sort rows by date within each person
    const sorted = Array.from(tables.entries()).map(([name, rows]) => {
      const r = [...rows].sort((a, b) => {
        const da = a.date.split('/').reverse().join('-');
        const db = b.date.split('/').reverse().join('-');
        return da.localeCompare(db);
      });
      return { name, rows: r };
    });
    // Sort people by name
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'mr'));
    return sorted;
  }, [history, persons, rangeStart, rangeEnd]);

  const gridRows = useMemo(() => {
    // Build map: personName -> 7 columns (Mon..Sun) with place labels from history
    const rows = new Map();
    const inRange = (dStr) => {
      const d = new Date(`${dStr}T00:00:00`);
      return d >= rangeStart && d <= rangeEnd;
    };
    (history || []).forEach(item => {
      if (!inRange(item.meetingDate)) return;
      const d = new Date(`${item.meetingDate}T00:00:00`);
      // index is based on day offset from rangeStart
      const idx = Math.floor((d - rangeStart) / (24 * 60 * 60 * 1000));
      const personName = item.personName || personIdToName(item.personId);
      if (!personName) return;
      const place = item.placeName || '';
      if (!rows.has(personName)) rows.set(personName, Array(dayDates.length).fill(''));
      const cols = rows.get(personName);
      cols[idx] = place;
    });
    // sort by name asc (locale)
    return Array.from(rows.entries()).sort((a, b) => a[0].localeCompare(b[0], 'mr'));
  }, [history, persons, rangeStart, rangeEnd, dayDates.length]);

  function saveExcel() {
    // Sheet 1: Weekly Grid (Schedule)
    const wsGridData = [];
    wsGridData.push(['॥ श्री राम कृपये ॥']);
    wsGridData.push(['॥ जने जन सूचने समये ॥']);
    const gridHeader = ['मंडलाचे नांव - ठाणापूर'];
    dayDates.forEach(d => {
      const dd = String(d.getDate());
      const label = `${weekdayNamesMr[d.getDay()]}-${dd}`;
      gridHeader.push(label);
    });
    wsGridData.push(gridHeader);
    gridRows.forEach(([name, cols]) => {
      wsGridData.push([name, ...cols]);
    });
    const totals = ['एकूण'];
    for (let i = 0; i < dayDates.length; i++) {
      let c = 0;
      gridRows.forEach(([, cols]) => { if (cols[i]) c += 1; });
      totals.push(String(c));
    }
    wsGridData.push(totals);

    const wsGrid = XLSX.utils.aoa_to_sheet(wsGridData);
    const gridCols = 1 + dayDates.length;
    wsGrid['!cols'] = Array.from({ length: gridCols }, (_, idx) => ({ wch: idx === 0 ? 28 : 18 }));
    wsGrid['!freeze'] = { xSplit: 1, ySplit: 3 };

    // Sheet 2: Per-person history (व्यक्तीनिहाय इतिहास)
    const wsPersonsData = [];
    wsPersonsData.push(['व्यक्तीनिहाय इतिहास']);
    wsPersonsData.push(['']);
    personTables.forEach((table) => {
      wsPersonsData.push(['॥ श्री राम समर्थ ॥']);
      wsPersonsData.push(['॥ जय जय रघुवीर समर्थ ॥']);
      wsPersonsData.push([`শ्री सदस्याचे नाव - ${table.name}`]);
      wsPersonsData.push(['दिनांक', 'वार', 'स्त्री/पुरुष', 'श्री बैठकीचे ठिकाण', 'वेळ']);
      table.rows.forEach(r => {
        wsPersonsData.push([r.date, r.weekday, r.gender, r.place, r.timeSlot]);
      });
      wsPersonsData.push(['']);
    });
    const wsPersons = XLSX.utils.aoa_to_sheet(wsPersonsData);
    wsPersons['!cols'] = Array.from({ length: 5 }, (_, idx) => ({ wch: [20, 12, 12, 28, 10][idx] || 18 }));

    // Create workbook and save with two distinct sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsGrid, 'Schedule');
    XLSX.utils.book_append_sheet(wb, wsPersons, 'व्यक्तीनिहाय इतिहास');
    const startLabel = `${String(rangeStart.getDate()).padStart(2,'0')}-${rangeStart.toLocaleString('en-US',{month:'short'})}-${String(rangeStart.getFullYear()).slice(-2)}`;
    const endLabel = `${String(rangeEnd.getDate()).padStart(2,'0')}-${rangeEnd.toLocaleString('en-US',{month:'short'})}-${String(rangeEnd.getFullYear()).slice(-2)}`;
    XLSX.writeFile(wb, `baithak_excel_${startLabel}_to_${endLabel}.xlsx`);
  }

  return (
    <div className="p-6">
      <h1 className="text-center text-xl font-bold mb-2">॥ श्री राम कृपये ॥</h1>
      <h2 className="text-center text-lg font-semibold mb-4">॥ जने जन सूचने समये ॥</h2>

      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">From date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Reload'}
        </button>
        <button
          onClick={saveExcel}
          disabled={loading || gridRows.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Export Excel
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="border border-black border-collapse w-full text-center">
          <thead>
            <tr>
              <th className="border border-black p-2 w-1/4">मंडलाचे नांव - ठाणापूर</th>
              {dayDates.map((d, i) => (
                <th key={i} className="border border-black p-2">
                  {`${weekdayNamesMr[d.getDay()]}-${d.getDate()}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridRows.map(([name, cols]) => (
              <tr key={name}>
                <td className="border border-black p-2">{name}</td>
                {cols.map((cell, i) => (
                  <td key={i} className="border border-black p-2">{cell}</td>
                ))}
              </tr>
            ))}
            {gridRows.length === 0 && (
              <tr>
                <td colSpan={8} className="border border-black p-2 text-gray-500 italic">No data for selected week</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-black p-2 font-bold">एकूण</td>
              {Array.from({ length: 7 }, (_, i) => {
                let c = 0;
                gridRows.forEach(([, cols]) => { if (cols[i]) c += 1; });
                return <td key={i} className="border border-black p-2">{c}</td>;
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Per-person history tables */}
      <div className="mt-8">
  <h3 className="text-lg font-semibold mb-3">व्यक्तीनिहाय इतिहास</h3>

  {/* 2x2 Grid just like Excel screenshot */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    {personTables.map((table, idx) => (
      <div
        key={idx}
        className="border border-black rounded p-3 flex flex-col justify-between"
      >
        {/* Header */}
        <div>
          <h1 className="text-center font-bold text-lg mb-1">॥ श्री राम समर्थ ॥</h1>
          <h2 className="text-center font-semibold text-md mb-1">
            ॥ जय जय रघुवीर समर्थ ॥
          </h2>
          <p className="text-center font-medium mb-3">
            {`श्री सदस्याचे नाव - ${table.name}`}
          </p>
        </div>

        {/* Table */}
        <table className="border border-black border-collapse w-full text-center text-sm">
          <thead>
            <tr className="bg-gray-100">
              {['दिनांक', 'वार', 'स्त्री/पुरुष', 'श्री बैठकीचे ठिकाण', 'वेळ'].map(
                (heading, i) => (
                  <th
                    key={i}
                    className="border border-black px-2 py-1 font-semibold"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i}>
                <td className="border border-black px-2 py-1">{r.date}</td>
                <td className="border border-black px-2 py-1">{r.weekday}</td>
                <td className="border border-black px-2 py-1">{r.gender}</td>
                <td className="border border-black px-2 py-1">{r.place}</td>
                <td className="border border-black px-2 py-1">{r.timeSlot}</td>
              </tr>
            ))}
            {table.rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="border border-black px-2 py-1 text-gray-500 italic"
                >
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    ))}

    {/* If no data */}
    {personTables.length === 0 && (
      <div className="text-gray-500 italic col-span-2 text-center">
        No entries found for the selected range.
      </div>
    )}
  </div>
</div>
    </div>
  );
}


