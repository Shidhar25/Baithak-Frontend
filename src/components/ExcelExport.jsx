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

  const weekdayNamesMr = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार'];

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

    // Sheet 2: Per-person history (व्यक्तीनिहाय इतिहास) - Side by Side Layout
    const wsPersonsData = [];
    wsPersonsData.push(['व्यक्तीनिहाय इतिहास']);
    wsPersonsData.push(['']);
    
    // Process personTables in pairs for side-by-side layout
    for (let i = 0; i < personTables.length; i += 2) {
      const leftTable = personTables[i];
      const rightTable = personTables[i + 1];
      
      // Calculate the maximum number of data rows needed for this pair
      const leftRows = leftTable.rows.length;
      const rightRows = rightTable ? rightTable.rows.length : 0;
      const maxRows = Math.max(leftRows, rightRows);
      
      // Create header rows for both boxes
      const headerRow = Array(12).fill(''); // 12 columns total (5 for left + 2 gap + 5 for right)
      const subHeaderRow = Array(12).fill('');
      const nameRow = Array(12).fill('');
      const tableHeaderRow = Array(12).fill('');
      
      // Left box headers (columns A-E)
      if (leftTable) {
        headerRow[0] = '॥ श्री राम समर्थ ॥';
        subHeaderRow[0] = '॥ जय जय रघुवीर समर्थ ॥';
        nameRow[0] = `শ्री सदस्याचे नाव - ${leftTable.name}`;
        tableHeaderRow[0] = 'दिनांक';
        tableHeaderRow[1] = 'वार';
        tableHeaderRow[2] = 'स्त्री/पुरुष';
        tableHeaderRow[3] = 'श्री बैठकीचे ठिकाण';
        tableHeaderRow[4] = 'वेळ';
      }
      
      // Right box headers (columns H-L)
      if (rightTable) {
        headerRow[7] = '॥ श्री राम समर्थ ॥';
        subHeaderRow[7] = '॥ जय जय रघुवीर समर्थ ॥';
        nameRow[7] = `শ्री सदस्याचे नाव - ${rightTable.name}`;
        tableHeaderRow[7] = 'दिनांक';
        tableHeaderRow[8] = 'वार';
        tableHeaderRow[9] = 'स्त्री/पुरुष';
        tableHeaderRow[10] = 'श्री बैठकीचे ठिकाण';
        tableHeaderRow[11] = 'वेळ';
      }
      
      // Add header rows
      wsPersonsData.push(headerRow);
      wsPersonsData.push(subHeaderRow);
      wsPersonsData.push(nameRow);
      wsPersonsData.push(tableHeaderRow);
      
      // Add data rows
      for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
        const dataRow = Array(12).fill('');
        
        // Left box data (columns A-E)
        if (leftTable && leftTable.rows[rowIndex]) {
          const leftRow = leftTable.rows[rowIndex];
          dataRow[0] = leftRow.date;
          dataRow[1] = leftRow.weekday;
          dataRow[2] = leftRow.gender;
          dataRow[3] = leftRow.place;
          dataRow[4] = leftRow.timeSlot;
        }
        
        // Right box data (columns H-L)
        if (rightTable && rightTable.rows[rowIndex]) {
          const rightRow = rightTable.rows[rowIndex];
          dataRow[7] = rightRow.date;
          dataRow[8] = rightRow.weekday;
          dataRow[9] = rightRow.gender;
          dataRow[10] = rightRow.place;
          dataRow[11] = rightRow.timeSlot;
        }
        
        wsPersonsData.push(dataRow);
      }
      
      // Add spacing row between pairs
      if (i + 2 < personTables.length) {
        wsPersonsData.push(Array(12).fill(''));
      }
    }
    
    const wsPersons = XLSX.utils.aoa_to_sheet(wsPersonsData);
    // Set column widths for side-by-side layout
    wsPersons['!cols'] = Array.from({ length: 12 }, (_, idx) => {
      const widths = [20, 12, 12, 28, 10, 2, 2, 20, 12, 12, 28, 10];
      return { wch: widths[idx] || 18 };
    });

    // Apply center alignment and formatting
    const centerAlignment = { h: 'center', v: 'center' };
    const boldStyle = { font: { bold: true } };
    
    // Apply formatting to all cells
    const range = XLSX.utils.decode_range(wsPersons['!ref']);
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!wsPersons[cellAddress]) wsPersons[cellAddress] = { v: '' };
        
        // Apply center alignment to all cells
        wsPersons[cellAddress].s = { 
          ...wsPersons[cellAddress].s, 
          alignment: centerAlignment
        };
      }
    }
    
    // Apply cell merging and formatting
    const mergeRanges = [];
    let currentRow = 2; // Start after title rows
    
    for (let i = 0; i < personTables.length; i += 2) {
      const leftTable = personTables[i];
      const rightTable = personTables[i + 1];
      
      // Calculate max rows for this pair
      const leftRows = leftTable ? leftTable.rows.length : 0;
      const rightRows = rightTable ? rightTable.rows.length : 0;
      const maxRows = Math.max(leftRows, rightRows);
      
      // Merge cells for left box (columns A-E)
      if (leftTable) {
        // Merge header rows (A-E)
        mergeRanges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } }); // ॥ श्री राम समर्थ ॥
        mergeRanges.push({ s: { r: currentRow + 1, c: 0 }, e: { r: currentRow + 1, c: 4 } }); // ॥ जय जय रघुवीर समर्थ ॥
        mergeRanges.push({ s: { r: currentRow + 2, c: 0 }, e: { r: currentRow + 2, c: 4 } }); // Member name
        
        // Apply bold formatting to merged header cells
        const leftHeaderCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
        const leftSubHeaderCell = XLSX.utils.encode_cell({ r: currentRow + 1, c: 0 });
        const leftNameCell = XLSX.utils.encode_cell({ r: currentRow + 2, c: 0 });
        
        if (wsPersons[leftHeaderCell]) {
          wsPersons[leftHeaderCell].s = { 
            ...wsPersons[leftHeaderCell].s, 
            font: { ...wsPersons[leftHeaderCell].s.font, ...boldStyle.font }
          };
        }
        if (wsPersons[leftSubHeaderCell]) {
          wsPersons[leftSubHeaderCell].s = { 
            ...wsPersons[leftSubHeaderCell].s, 
            font: { ...wsPersons[leftSubHeaderCell].s.font, ...boldStyle.font }
          };
        }
        if (wsPersons[leftNameCell]) {
          wsPersons[leftNameCell].s = { 
            ...wsPersons[leftNameCell].s, 
            font: { ...wsPersons[leftNameCell].s.font, ...boldStyle.font }
          };
        }
      }
      
      // Merge cells for right box (columns H-L)
      if (rightTable) {
        // Merge header rows (H-L)
        mergeRanges.push({ s: { r: currentRow, c: 7 }, e: { r: currentRow, c: 11 } }); // ॥ श्री राम समर्थ ॥
        mergeRanges.push({ s: { r: currentRow + 1, c: 7 }, e: { r: currentRow + 1, c: 11 } }); // ॥ जय जय रघुवीर समर्थ ॥
        mergeRanges.push({ s: { r: currentRow + 2, c: 7 }, e: { r: currentRow + 2, c: 11 } }); // Member name
        
        // Apply bold formatting to merged header cells
        const rightHeaderCell = XLSX.utils.encode_cell({ r: currentRow, c: 7 });
        const rightSubHeaderCell = XLSX.utils.encode_cell({ r: currentRow + 1, c: 7 });
        const rightNameCell = XLSX.utils.encode_cell({ r: currentRow + 2, c: 7 });
        
        if (wsPersons[rightHeaderCell]) {
          wsPersons[rightHeaderCell].s = { 
            ...wsPersons[rightHeaderCell].s, 
            font: { ...wsPersons[rightHeaderCell].s.font, ...boldStyle.font }
          };
        }
        if (wsPersons[rightSubHeaderCell]) {
          wsPersons[rightSubHeaderCell].s = { 
            ...wsPersons[rightSubHeaderCell].s, 
            font: { ...wsPersons[rightSubHeaderCell].s.font, ...boldStyle.font }
          };
        }
        if (wsPersons[rightNameCell]) {
          wsPersons[rightNameCell].s = { 
            ...wsPersons[rightNameCell].s, 
            font: { ...wsPersons[rightNameCell].s.font, ...boldStyle.font }
          };
        }
      }
      
      // Move to next pair
      currentRow += 4 + maxRows + 1; // 4 header rows + max data rows + 1 spacing row
    }
    
    // Apply the merge ranges
    wsPersons['!merges'] = mergeRanges;

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

  {/* Side-by-side layout matching Excel export */}
  <div className="space-y-8">
    {/* Process personTables in pairs for side-by-side layout */}
    {Array.from({ length: Math.ceil(personTables.length / 2) }, (_, pairIndex) => {
      const leftTable = personTables[pairIndex * 2];
      const rightTable = personTables[pairIndex * 2 + 1];
      
      return (
        <div key={pairIndex} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Box */}
          <div className="border border-black rounded p-3 flex flex-col justify-between">
            {leftTable && (
              <>
                {/* Header */}
                <div>
                  <h1 className="text-center font-bold text-lg mb-1">॥ श्री राम समर्थ ॥</h1>
                  <h2 className="text-center font-semibold text-md mb-1">
                    ॥ जय जय रघुवीर समर्थ ॥
                  </h2>
                  <p className="text-center font-medium mb-3">
                    {`श्री सदस्याचे नाव - ${leftTable.name}`}
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
                    {leftTable.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border border-black px-2 py-1">{r.date}</td>
                        <td className="border border-black px-2 py-1">{r.weekday}</td>
                        <td className="border border-black px-2 py-1">{r.gender}</td>
                        <td className="border border-black px-2 py-1">{r.place}</td>
                        <td className="border border-black px-2 py-1">{r.timeSlot}</td>
                      </tr>
                    ))}
                    {leftTable.rows.length === 0 && (
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
              </>
            )}
          </div>

          {/* Right Box */}
          <div className="border border-black rounded p-3 flex flex-col justify-between">
            {rightTable && (
              <>
        {/* Header */}
        <div>
          <h1 className="text-center font-bold text-lg mb-1">॥ श्री राम समर्थ ॥</h1>
          <h2 className="text-center font-semibold text-md mb-1">
            ॥ जय जय रघुवीर समर्थ ॥
          </h2>
          <p className="text-center font-medium mb-3">
                    {`শ्री सदस्याचे नाव - ${rightTable.name}`}
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
                    {rightTable.rows.map((r, i) => (
              <tr key={i}>
                <td className="border border-black px-2 py-1">{r.date}</td>
                <td className="border border-black px-2 py-1">{r.weekday}</td>
                <td className="border border-black px-2 py-1">{r.gender}</td>
                <td className="border border-black px-2 py-1">{r.place}</td>
                <td className="border border-black px-2 py-1">{r.timeSlot}</td>
              </tr>
            ))}
                    {rightTable.rows.length === 0 && (
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
              </>
            )}
          </div>
      </div>
      );
    })}

    {/* If no data */}
    {personTables.length === 0 && (
      <div className="text-gray-500 italic text-center">
        No entries found for the selected range.
      </div>
    )}
  </div>
</div>
    </div>
  );
}


