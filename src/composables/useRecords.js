import { ref, computed, watch } from 'vue'
import { supabase } from '../lib/supabase.js'

let _uid = 0
const uid = () => ++_uid

export function makeRow() {
  return {
    id: uid(), codeNo: '', qty: '', toolName: '', controlNo: '',
    condition: '', damageNotes: '', accessoriesReturned: null,
    remarks: '', showBorrowers: false, borrowers: []
  }
}

export function makeBorrower() {
  return {
    id: uid(), name: '', project: '',
    conditionCheckout: '', conditionCheckoutNotes: '',
    withdraw: 0, dateBorrowed: '', timeBorrowed: '',
    returned: false, returnDate: '', returnTime: '',
    conditionReturn: '', conditionReturnNotes: ''
  }
}

export function useRecords() {
  const recordDate   = ref(new Date().toISOString().slice(0, 10))
  const newEquipRows = ref([makeRow()])
  const oldEquipRows = ref([makeRow()])
  const history      = ref([])

  // ── Load all history from Supabase ──────────────────────────
  async function loadHistory() {
    const { data, error } = await supabase
      .from('history_records')
      .select('*')
      .order('date', { ascending: false })

    if (error) { console.error('loadHistory error', error); return }

    history.value = data.map(row => ({
      date:         row.date,
      savedAt:      row.saved_at,
      newEquipRows: row.new_equip_rows || [],
      oldEquipRows: row.old_equip_rows || [],
    }))

    // Restore active draft from localStorage (draft never goes to Supabase)
    try {
      const active = JSON.parse(localStorage.getItem('eqt_active_record') || 'null')
      if (active) {
        if (active.recordDate)  recordDate.value   = active.recordDate
        if (active.newEquipRows?.length) newEquipRows.value = active.newEquipRows
        if (active.oldEquipRows?.length) oldEquipRows.value = active.oldEquipRows
      }
    } catch (e) { console.error(e) }
  }

  function persistActive() {
    localStorage.setItem('eqt_active_record', JSON.stringify({
      recordDate: recordDate.value,
      newEquipRows: JSON.parse(JSON.stringify(newEquipRows.value)),
      oldEquipRows: JSON.parse(JSON.stringify(oldEquipRows.value)),
    }))
  }

  // ── Row operations ───────────────────────────────────────────
  function addRow(section) {
    if (section === 'new') newEquipRows.value.push(makeRow())
    else oldEquipRows.value.push(makeRow())
    persistActive()
  }

  function removeRow(section, index) {
    if (section === 'new') newEquipRows.value.splice(index, 1)
    else oldEquipRows.value.splice(index, 1)
    persistActive()
  }

  function clearAll() {
    newEquipRows.value = [makeRow()]
    oldEquipRows.value = [makeRow()]
    localStorage.removeItem('eqt_active_record')
  }

  function toggleBorrowers(row) { row.showBorrowers = !row.showBorrowers }
  function addBorrower(row)     { row.borrowers.push(makeBorrower()); row.showBorrowers = true }
  function removeBorrower(row, index) { row.borrowers.splice(index, 1) }

  // ── Save / Load / Delete ─────────────────────────────────────
  async function saveRecord() {
    const record = {
      date:          recordDate.value,
      saved_at:      new Date().toISOString(),
      new_equip_rows: JSON.parse(JSON.stringify(newEquipRows.value)),
      old_equip_rows: JSON.parse(JSON.stringify(oldEquipRows.value)),
    }

    const { error } = await supabase
      .from('history_records')
      .upsert(record, { onConflict: 'date' })  // update if date exists

    if (error) { console.error('saveRecord error', error); return }

    // Update local history array too
    const idx = history.value.findIndex(r => r.date === recordDate.value)
    const localRecord = {
      date: record.date, savedAt: record.saved_at,
      newEquipRows: record.new_equip_rows,
      oldEquipRows: record.old_equip_rows,
    }
    if (idx >= 0) history.value[idx] = localRecord
    else history.value.push(localRecord)

    persistActive()
    return localRecord
  }

  function loadRecord(record) {
    recordDate.value   = record.date
    newEquipRows.value = JSON.parse(JSON.stringify(record.newEquipRows))
    oldEquipRows.value = JSON.parse(JSON.stringify(record.oldEquipRows))
    persistActive()
  }

  async function deleteRecord(date) {
    const { error } = await supabase
      .from('history_records')
      .delete()
      .eq('date', date)

    if (error) { console.error('deleteRecord error', error); return }
    history.value = history.value.filter(r => r.date !== date)
  }

  // ── Computed ─────────────────────────────────────────────────
  const totalBorrowers = (record) => {
    let count = 0
    ;[...(record.newEquipRows || []), ...(record.oldEquipRows || [])]
      .forEach(r => (count += (r.borrowers || []).length))
    return count
  }

  const sortedHistory = computed(() =>
    [...history.value].sort((a, b) => b.date.localeCompare(a.date))
  )

  const savedDates = computed(() => new Set(history.value.map(r => r.date)))

  const hasDraft = computed(() => {
    const hasData = rows => rows.some(r => r.codeNo || r.toolName || r.borrowers.length > 0)
    return hasData(newEquipRows.value) || hasData(oldEquipRows.value)
  })

  async function switchToDate(date) {
    const existing = history.value.find(r => r.date === date)
    if (existing) {
      recordDate.value   = existing.date
      newEquipRows.value = JSON.parse(JSON.stringify(existing.newEquipRows || [makeRow()]))
      oldEquipRows.value = JSON.parse(JSON.stringify(existing.oldEquipRows || [makeRow()]))
      if (!newEquipRows.value.length) newEquipRows.value = [makeRow()]
      if (!oldEquipRows.value.length) oldEquipRows.value = [makeRow()]
    } else {
      recordDate.value   = date
      newEquipRows.value = [makeRow()]
      oldEquipRows.value = [makeRow()]
    }
    persistActive()
  }

  watch([recordDate, newEquipRows, oldEquipRows], () => { persistActive() }, { deep: true })

  return {
    recordDate, newEquipRows, oldEquipRows, history,
    sortedHistory, savedDates, hasDraft,
    loadHistory, switchToDate,
    addRow, removeRow, clearAll,
    toggleBorrowers, addBorrower, removeBorrower,
    saveRecord, loadRecord, deleteRecord, totalBorrowers
  }
}