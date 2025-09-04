export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8082'  ;

export const API = {
  females: `${API_BASE}/users/v1/all/female`,
  femalePlaces: `${API_BASE}/places/v1/all/female`,
  males: `${API_BASE}/users/v1/all/male`,
  malePlaces: `${API_BASE}/places/v1/all/male`,
  history: (personId) => `${API_BASE}/assignments/v1/person/${personId}/history`,
  // New history endpoints with date range support
  assignmentHistory: (fromDate, toDate) => 
    `${API_BASE}/assignments/history?fromDate=${fromDate}&toDate=${toDate}`,
  assignmentHistoryByPerson: (personId, fromDate, toDate) => 
    `${API_BASE}/assignments/history/person/${personId}?fromDate=${fromDate}&toDate=${toDate}`,
  assignmentHistoryByPlace: (placeId, fromDate, toDate) => 
    `${API_BASE}/assignments/history/place/${placeId}?fromDate=${fromDate}&toDate=${toDate}`,
  assignmentHistoryCreated: (fromDateTime, toDateTime) =>
    `${API_BASE}/assignments/history/created?fromDateTime=${fromDateTime}&toDateTime=${toDateTime}`,
  assign: (personId, placeId, date) =>
    `${API_BASE}/assignments/v1/person/${personId}/assign?placeId=${placeId}&date=${date}`,
  overview: `${API_BASE}/assignments/v1/overview`,
  updateAssignmentDate: (assignmentId, date) =>
    `${API_BASE}/assignments/v1/assignment/${assignmentId}/date?date=${date}`,
  updateAssignmentPerson: (assignmentId, personId) =>
    `${API_BASE}/assignments/v1/assignment/${assignmentId}/person/${personId}`,
};

export async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
}

export function formatIsoDate(isoDateString) {
  try {
    const date = new Date(`${isoDateString}T00:00:00`);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return isoDateString;
  }
}

export function weekdayFromDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

export function todayInputValue() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function dateToInputValue(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function nextWeekStartInputValue() {
  const today = new Date();
  const dayIndexMondayBased = (today.getDay() + 6) % 7; // Monday=0 ... Sunday=6
  const currentMonday = new Date(today);
  currentMonday.setHours(0, 0, 0, 0);
  currentMonday.setDate(today.getDate() - dayIndexMondayBased);
  const nextMonday = new Date(currentMonday);
  nextMonday.setDate(currentMonday.getDate() + 7);
  return dateToInputValue(nextMonday);
}

export function nextWeekEndInputValue() {
  const startStr = nextWeekStartInputValue();
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return dateToInputValue(end);
}

// New helper functions for history with date ranges
export function dateToIsoDateTime(date) {
  return date.toISOString();
}

// Local ISO without timezone suffix (no Z), e.g. 2025-09-01T00:00:00
function toLocalIsoString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

export function inputValueToLocalIsoStartOfDay(inputValue) {
  const date = new Date(`${inputValue}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return toLocalIsoString(date);
}

export function inputValueToLocalIsoEndOfDay(inputValue) {
  const date = new Date(`${inputValue}T00:00:00`);
  date.setHours(23, 59, 59, 0);
  return toLocalIsoString(date);
}

export function getDefaultDateRange() {
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 30); // Default to last 30 days
  
  return {
    fromDate: dateToInputValue(fromDate),
    toDate: dateToInputValue(today)
  };
}

