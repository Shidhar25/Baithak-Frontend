import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { API, fetchJSON, todayInputValue, weekdayFromDate, nextWeekStartInputValue, nextWeekEndInputValue, getCachedJSON, setCachedJSON } from './api'
import Header from './components/Header'
import Alert from './components/Alert'
import ProfileCard from './components/ProfileCard'
import HistoryTable from './components/HistoryTable'
import PlacesGrid from './components/PlacesGrid'
import AdvancedHistory from './components/AdvancedHistory'
import SelectSection from './components/SelectSection'

function MaleApp() {
  const [persons, setPersons] = useState([])
  const [places, setPlaces] = useState([])
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [historyRows, setHistoryRows] = useState([])
  const [overview, setOverview] = useState([])
  const [dateValue, setDateValue] = useState(todayInputValue())
  const [placeValue, setPlaceValue] = useState('')
  const [alert, setAlert] = useState({ type: 'info', message: '' })
  const [loading, setLoading] = useState(false)
  const nextWeekMin = nextWeekStartInputValue()
  const nextWeekMax = nextWeekEndInputValue()
  const [allPersonsForHistory, setAllPersonsForHistory] = useState([])
  const [allPlacesForHistory, setAllPlacesForHistory] = useState([])

  const derivedDayLabel = useMemo(() => {
    if (!dateValue) return ''
    const d = new Date(dateValue)
    const day = d.toLocaleDateString('en-US', { weekday: 'long' })
    return `Day: ${day}`
  }, [dateValue])

  function showAlert(type, message) {
    setAlert({ type, message })
    window.clearTimeout((showAlert)._t)
    ;(showAlert)._t = window.setTimeout(() => setAlert({ type: 'info', message: '' }), 3500)
  }

  async function refreshOverview(showLoading = true) {
    if (showLoading) {
      setIsRefreshingOverview(true)
    }
    try {
      // First, try to get cached data immediately
      const cachedOverview = getCachedJSON('overview', 5 * 60 * 1000); // 5 min cache
      
      // Comprehensive logging for cached overview
      console.group('Male App - Cached Overview');
      console.log('Cached Overview:', cachedOverview);
      console.log('Cached Overview Type:', typeof cachedOverview);
      console.log('Is Array:', Array.isArray(cachedOverview));
      if (Array.isArray(cachedOverview)) {
        console.log('Cached Overview Length:', cachedOverview.length);
        console.log('First Few Cached Overview Items:', cachedOverview.slice(0, 5));
        
        // Log unique time slots in cached overview
        const uniqueTimeSlots = [...new Set(cachedOverview.map(p => p?.timeSlot))];
        console.log('Unique Time Slots in Cached Overview:', uniqueTimeSlots);
      }
      console.groupEnd();

      // Set cached overview if available
      if (cachedOverview) {
        setOverview(Array.isArray(cachedOverview) ? cachedOverview : [])
      }

      // Fetch fresh data in background
      const ov = await fetchJSON(API.overview)
      
      // Comprehensive logging for fetched overview
      console.group('Male App - Fetched Overview');
      console.log('Fetched Overview:', ov);
      console.log('Fetched Overview Type:', typeof ov);
      console.log('Is Array:', Array.isArray(ov));
      if (Array.isArray(ov)) {
        console.log('Fetched Overview Length:', ov.length);
        console.log('First Few Fetched Overview Items:', ov.slice(0, 5));
        
        // Log unique time slots in fetched overview
        const uniqueTimeSlots = [...new Set(ov.map(p => p?.timeSlot))];
        console.log('Unique Time Slots in Fetched Overview:', uniqueTimeSlots);
      }
      console.groupEnd();
      
      if (Array.isArray(ov)) {
        // Update cache
        setCachedJSON('overview', ov)
        
        // Update state
        setOverview(ov)
      }
      
      setLastOverviewUpdate(Date.now())
    } catch (e) {
      console.error('Overview Refresh Error:', e)
      showAlert('error', `Failed to refresh overview: ${e.message}`)
    } finally {
      if (showLoading) {
        setIsRefreshingOverview(false)
      }
    }
  }

  useEffect(() => {
    async function boot() {
      setLoading(true)
      try {
        // Use cache instantly if available
        const cachedMales = getCachedJSON('males', 5 * 60 * 1000)
        const cachedMalePlaces = getCachedJSON('malePlaces', 5 * 60 * 1000)
        
        if (Array.isArray(cachedMales)) {
          setPersons(cachedMales.filter(p => p.gender === 'MALE'))
        }
        
        if (Array.isArray(cachedMalePlaces)) {
          setPlaces(cachedMalePlaces)
        }

        // 1) Load essential male data first (fast initial UI) and refresh cache
        const [males, malePlaces] = await Promise.all([
          fetchJSON(API.males).then(data => { setCachedJSON('males', data); return data }),
          fetchJSON(API.malePlaces).then(data => { setCachedJSON('malePlaces', data); return data }),
        ])
        
        const maleOnly = Array.isArray(males) ? males.filter(p => p.gender === 'MALE') : []
        
        setPersons(maleOnly)
        setPlaces(Array.isArray(malePlaces) ? malePlaces : [])
      } catch (e) {
        showAlert('error', `Failed to load initial data: ${e.message}`)
      } finally {
        setLoading(false)
      }

      // 2) Load non-critical data in background
      ;(async () => {
        try {
          const [femalesRes, femalePlacesRes, ovRes, malesResBg] = await Promise.allSettled([
            fetchJSON(API.females).then(data => { setCachedJSON('females', data); return data }),
            fetchJSON(API.femalePlaces).then(data => { setCachedJSON('femalePlaces', data); return data }),
            fetchJSON(API.overview).then(data => { 
              console.log('Background Overview Fetch:', data);
              setCachedJSON('overview', data); 
              return data 
            }),
            fetchJSON(API.males).then(data => { setCachedJSON('males', data); return data }),
          ])

          const females = femalesRes.status === 'fulfilled' ? femalesRes.value : []
          const femalePlaces = femalePlacesRes.status === 'fulfilled' ? femalePlacesRes.value : []
          const ov = ovRes.status === 'fulfilled' ? ovRes.value : []
          const malesAll = malesResBg.status === 'fulfilled' ? malesResBg.value : []

          const onlyFemales = Array.isArray(females) ? females.filter(p => p.gender === 'FEMALE') : []
          const allPersons = [
            ...(Array.isArray(malesAll) ? malesAll : []),
            ...onlyFemales,
          ]
          const allPlaces = [
            ...((Array.isArray(places) ? places : [])),
            ...(Array.isArray(femalePlaces) ? femalePlaces : []),
          ]
          
          // Log overview data before setting
          console.group('Male App - Background Overview');
          console.log('Overview Data:', ov);
          console.log('Overview Type:', typeof ov);
          console.log('Is Array:', Array.isArray(ov));
          if (Array.isArray(ov)) {
            console.log('Overview Length:', ov.length);
            console.log('First Few Overview Items:', ov.slice(0, 5));
          }
          console.groupEnd();

          setAllPersonsForHistory(allPersons)
          setAllPlacesForHistory(allPlaces)
          setOverview(Array.isArray(ov) ? ov : [])
        } catch (_) {
          // ignore background errors
        }
      })()
    }
    boot()
  }, [])

  useEffect(() => {
    const person = (persons || []).find(p => String(p.personId) === String(selectedPersonId)) || null
    setSelectedPerson(person)
  }, [selectedPersonId, persons])

  async function loadHistory(personId) {
    if (!personId) {
      setHistoryRows([])
      return
    }
    try {
      const rows = await fetchJSON(API.history(personId))
      setHistoryRows(Array.isArray(rows) ? rows.slice(-10) : [])
    } catch (e) {
      setHistoryRows([])
      showAlert('error', `Failed to load history: ${e.message}`)
    }
  }

  useEffect(() => {
    if (selectedPerson) {
      loadHistory(selectedPerson.personId)
    } else {
      setHistoryRows([])
    }
  }, [selectedPerson])

  async function handleAssign() {
    if (!selectedPerson) {
      showAlert('error', 'Choose a representative first.')
      return
    }
    if (!dateValue || !placeValue) {
      showAlert('error', 'Select both date and place.')
      return
    }

    const chosenDay = weekdayFromDate(dateValue)
    // Check if there's already an assignment on the same day AND date
    const conflictingAssignment = (historyRows || []).find(h =>
      h.meetingDay === chosenDay &&
      h.meetingDate === dateValue
    );

    if (conflictingAssignment) {
      showAlert('error', `Already has a meeting on ${chosenDay} (${dateValue}).`)
      return
    }

    try {
      await fetchJSON(API.assign(selectedPerson.personId, placeValue, dateValue), { method: 'POST' })
      showAlert('success', 'Assignment saved.')
      setPlaceValue('')
      await loadHistory(selectedPerson.personId)
      const ov = await fetchJSON(API.overview)
      setOverview(Array.isArray(ov) ? ov : [])
    } catch (e) {
      showAlert('error', `Failed to save assignment: ${e.message}`)
    }
  }

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen">
      <div className="max-w-5xl mx-auto p-6">
        <Header subtitle="Manual scheduling for male representatives" />
        <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: 'info', message: '' })} />

        <div className="grid md:grid-cols-3 gap-6">
          <SelectSection
            persons={persons}
            places={places}
            currentHistory={historyRows}
            selectedPersonId={selectedPersonId}
            onSelectPerson={setSelectedPersonId}
            dateValue={dateValue}
            onChangeDate={setDateValue}
            onAssign={handleAssign}
            placeValue={placeValue}
            onChangePlace={setPlaceValue}
            derivedDayLabel={derivedDayLabel}
            choosePersonPlaceholder="-- choose male representative --"
            choosePlacePlaceholder="-- choose male place --"
            dateMin={nextWeekMin}
            dateMax={nextWeekMax}
            buttonClass="bg-blue-600 hover:bg-blue-700"
          />

          <section className="md:col-span-2 space-y-4">
            <ProfileCard
              person={selectedPerson}
              onRefresh={() => {
                if (!selectedPerson) return
                Promise.all([
                  loadHistory(selectedPerson.personId),
                  fetchJSON(API.overview).then(ov => setOverview(Array.isArray(ov) ? ov : [])),
                ]).then(() => showAlert('info', 'Refreshed.'))
              }}
            />
            <HistoryTable
              rows={historyRows}
              persons={persons}
              dateMin={nextWeekMin}
              dateMax={nextWeekMax}
              onEditDate={async (assignmentId, date) => {
                try {
                  await fetchJSON(API.updateAssignmentDate(assignmentId, date), { method: 'PUT' })
                  await loadHistory(selectedPerson.personId)
                  const ov = await fetchJSON(API.overview)
                  setOverview(Array.isArray(ov) ? ov : [])
                  showAlert('success', 'Assignment date updated.')
                } catch (e) {
                  showAlert('error', `Failed to update: ${e.message}`)
                }
              }}
              onEditPerson={async (assignmentId, personId) => {
                try {
                  const resp = await fetchJSON(API.updateAssignmentPerson(assignmentId, personId), { method: 'PUT' })
                  await loadHistory(selectedPerson.personId)
                  const ov = await fetchJSON(API.overview)
                  setOverview(Array.isArray(ov) ? ov : [])
                  if (resp && typeof resp === 'object') {
                    const msg = `Updated assignment ${resp.assignmentId} → ${resp.personName} on ${resp.meetingDate} (${resp.meetingDay}) at ${resp.placeName}`
                    showAlert('success', msg)
                  } else {
                    showAlert('success', 'Assignment person updated.')
                  }
                } catch (e) {
                  showAlert('error', `Failed to update person: ${e.message}`)
                }
              }}
            />
          </section>
        </div>

        <PlacesGrid
          overview={overview}
          dateMin={nextWeekMin}
          dateMax={nextWeekMax}
          persons={persons}
          onEditDate={async (assignmentId, date) => {
            try {
              const ensureId = async (maybeId, placeItem) => {
                if (maybeId) return maybeId
                const currentDate = placeItem?.meetingDate
                if (!currentDate) throw new Error('Cannot resolve assignment id')
                const initialCandidates = []
                if (placeItem?.personId) initialCandidates.push(placeItem.personId)
                const byName = persons.find(per => per.name === placeItem?.personName)
                if (byName?.personId) initialCandidates.push(byName.personId)
                const searchIds = initialCandidates.length ? initialCandidates : persons.map(p => p.personId)
                for (const pid of searchIds) {
                  try {
                    const hist = await fetchJSON(API.history(pid))
                    const match = (hist || []).find(h => String(h.placeId) === String(placeItem.placeId) && h.meetingDate === currentDate)
                    if (match?.assignmentId) return match.assignmentId
                  } catch (_) {
                    // ignore and continue
                  }
                }
                throw new Error('Assignment id not found')
              }
              const finalId = await ensureId(assignmentId, arguments[2])
              await fetchJSON(API.updateAssignmentDate(finalId, date), { method: 'PUT' })
              if (selectedPerson) {
                await loadHistory(selectedPerson.personId)
              }
              const ov = await fetchJSON(API.overview)
              setOverview(Array.isArray(ov) ? ov : [])
              showAlert('success', 'Assignment date updated.')
            } catch (e) {
              showAlert('error', `Failed to update: ${e.message}`)
            }
          }}
          onEditPerson={async (assignmentId, personId) => {
            try {
              const ensureId = async (maybeId, placeItem) => {
                if (maybeId) return maybeId
                const currentDate = placeItem?.meetingDate
                if (!currentDate) throw new Error('Cannot resolve assignment id')
                const initialCandidates = []
                if (placeItem?.personId) initialCandidates.push(placeItem.personId)
                const byName = persons.find(per => per.name === placeItem?.personName)
                if (byName?.personId) initialCandidates.push(byName.personId)
                const searchIds = initialCandidates.length ? initialCandidates : persons.map(p => p.personId)
                for (const pid of searchIds) {
                  try {
                    const hist = await fetchJSON(API.history(pid))
                    const match = (hist || []).find(h => String(h.placeId) === String(placeItem.placeId) && h.meetingDate === currentDate)
                    if (match?.assignmentId) return match.assignmentId
                  } catch (_) {
                    // ignore and continue
                  }
                }
                throw new Error('Assignment id not found')
              }
              const finalId = await ensureId(assignmentId, arguments[2])
              const resp = await fetchJSON(API.updateAssignmentPerson(finalId, personId), { method: 'PUT' })
              if (selectedPerson) {
                await loadHistory(selectedPerson.personId)
              }
              const ov = await fetchJSON(API.overview)
              setOverview(Array.isArray(ov) ? ov : [])
              if (resp && typeof resp === 'object') {
                const msg = `Updated assignment ${resp.assignmentId} → ${resp.personName} on ${resp.meetingDate} (${resp.meetingDay}) at ${resp.placeName}`
                showAlert('success', msg)
              } else {
                showAlert('success', 'Assignment person updated.')
              }
            } catch (e) {
              showAlert('error', `Failed to update person: ${e.message}`)
            }
          }}
        />

        {/* Advanced History Section */}
        <div id="history" className="mt-8">
          <AdvancedHistory persons={allPersonsForHistory} places={allPlacesForHistory} />
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
            <div className="bg-white shadow px-4 py-2 rounded text-sm">Loading…</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MaleApp


