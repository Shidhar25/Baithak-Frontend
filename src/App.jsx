import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { API, fetchJSON, todayInputValue, weekdayFromDate, nextWeekStartInputValue, nextWeekEndInputValue } from './api'
import Header from './components/Header'
import Alert from './components/Alert'
import ProfileCard from './components/ProfileCard'
import HistoryTable from './components/HistoryTable'
import PlacesGrid from './components/PlacesGrid'
import SelectSection from './components/SelectSection'
import AdvancedHistory from './components/AdvancedHistory'

function App() {
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

  useEffect(() => {
    async function boot() {
      setLoading(true)
      try {
        const [females, femalePlaces, ov] = await Promise.all([
          fetchJSON(API.females),
          fetchJSON(API.femalePlaces),
          fetchJSON(API.overview),
        ])
        setPersons(Array.isArray(females) ? females.filter(p => p.gender === 'FEMALE') : [])
        setPlaces(Array.isArray(femalePlaces) ? femalePlaces : [])
        setOverview(Array.isArray(ov) ? ov.filter(p => p && p.timeSlot === 'EARLY_MORNING') : [])
      } catch (e) {
        showAlert('error', `Failed to load initial data: ${e.message}`)
      } finally {
        setLoading(false)
      }
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
    if ((historyRows || []).some(h => h.meetingDay === chosenDay)) {
      showAlert('error', `Already has a meeting on ${chosenDay}.`)
      return
    }

    try {
      await fetchJSON(API.assign(selectedPerson.personId, placeValue, dateValue), { method: 'POST' })
      showAlert('success', 'Assignment saved.')
      setPlaceValue('')
      await loadHistory(selectedPerson.personId)
      const ov = await fetchJSON(API.overview)
      setOverview(Array.isArray(ov) ? ov.filter(p => p && p.timeSlot === 'EARLY_MORNING') : [])
    } catch (e) {
      showAlert('error', `Failed to save assignment: ${e.message}`)
    }
  }

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen">
      <div className="max-w-5xl mx-auto p-6">
        <Header subtitle="Manual scheduling for female representatives" />
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
            dateMin={nextWeekMin}
            dateMax={nextWeekMax}
          />

          <section className="md:col-span-2 space-y-4">
            <ProfileCard
              person={selectedPerson}
              onRefresh={() => {
                if (!selectedPerson) return
                Promise.all([
                  loadHistory(selectedPerson.personId),
                  fetchJSON(API.overview).then(ov => setOverview(Array.isArray(ov) ? ov.filter(p => p && p.timeSlot === 'EARLY_MORNING') : [])),
                ]).then(() => showAlert('info', 'Refreshed.'))
              }}
            />
            <HistoryTable
              rows={historyRows}
              dateMin={nextWeekMin}
              dateMax={nextWeekMax}
              onEditDate={async (assignmentId, date) => {
                try {
                  await fetchJSON(API.updateAssignmentDate(assignmentId, date), { method: 'PUT' })
                  await loadHistory(selectedPerson.personId)
                  const ov = await fetchJSON(API.overview)
                  setOverview(Array.isArray(ov) ? ov.filter(p => p && p.timeSlot === 'EARLY_MORNING') : [])
                  showAlert('success', 'Assignment date updated.')
                } catch (e) {
                  showAlert('error', `Failed to update: ${e.message}`)
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
              setOverview(Array.isArray(ov) ? ov.filter(p => p && p.timeSlot === 'EARLY_MORNING') : [])
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
              setOverview(Array.isArray(ov) ? ov.filter(p => p && p.timeSlot === 'EARLY_MORNING') : [])
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
          <AdvancedHistory persons={persons} places={places} />
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

export default App
