"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Database,
  Calculator,
  Menu,
  Search,
  Download,
  Plus,
  Trash2,
} from "lucide-react"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

interface ExcelData {
  [key: string]: any[]
}

interface EmployeeGrade {
  id?: number
  nip: string
  nama: string
  golongan: string
}

interface CalculationResult {
  nama: string
  nip: string
  golongan: string
  wfoDays: number
  baseAmount: number
  taxAmount: number
  totalUangMakan: number
}

interface TunjanganKinerja {
  id?: number
  nip: string
  nama: string
  jabatan: string
  unit_kerja: string
  tunjangan_kinerja: number
}

interface TunjanganKinerjaResult {
  nama: string
  nip: string
  jabatan: string
  unit_kerja: string
  tunjangan_kinerja_full: number
  total_absensi: number
  tunjangan_kinerja_calculated: number
}

interface AttendanceRecord {
  nama: string
  nip: string
  keterangan: string
  totalDays: number
  attendanceCounts: {
    A: number
    T1: number
    T2: number
    T3: number
    T4: number
    P1: number
    P2: number
    P3: number
    P4: number
    CUTI: number
    TL: number
    HADIR: number
  }
  cutPercentage: number
  tunjanganBefore: number
  tunjanganAfter: number
  nominalCut: number
}

export default function ExcelViewer() {
  const [excelData, setExcelData] = useState<ExcelData>({})
  const [activeSheet, setActiveSheet] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [fileName, setFileName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null) // For ADK Uang Makan Excel upload
  const attendanceFileInputRef = useRef<HTMLInputElement>(null) // For attendance data upload
  const employeeGradeFileInputRef = useRef<HTMLInputElement>(null) // For employee grades upload
  const tunjanganKinerjaFileInputRef = useRef<HTMLInputElement>(null) // For tunjangan kinerja upload

  const [activeMenu, setActiveMenu] = useState<
    "viewer" | "calculator" | "employee-data" | "tunjangan-kinerja" | "website"
  >("viewer")

  const [employeeGrades, setEmployeeGrades] = useState<EmployeeGrade[]>([])
  const [employeeGradeError, setEmployeeGradeError] = useState<string>("")
  const [newEmployee, setNewEmployee] = useState({
    nip: "",
    nama: "",
    golongan: "",
  })
  const [isAddingEmployee, setIsAddingEmployee] = useState(false)
  const [isImporting, setIsImporting] = useState(false) // Added state for import functionality

  const [tunjanganKinerja, setTunjanganKinerja] = useState<TunjanganKinerja[]>([])
  const [tunjanganKinerjaError, setTunjanganKinerjaError] = useState<string>("")
  const [newTunjanganKinerja, setNewTunjanganKinerja] = useState({
    nip: "",
    nama: "",
    jabatan: "",
    unit_kerja: "",
    tunjangan_kinerja: "",
  })
  const [isAddingTunjanganKinerja, setIsAddingTunjanganKinerja] = useState(false)
  const [isImportingTunjanganKinerja, setIsImportingTunjanganKinerja] = useState(false)
  const [tunjanganKinerjaResults, setTunjanganKinerjaResults] = useState<TunjanganKinerjaResult[]>([])

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [isUploadingAttendance, setIsUploadingAttendance] = useState(false)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)
  const [rawAttendanceData, setRawAttendanceData] = useState<any[][]>([])

  const [searchExcel, setSearchExcel] = useState("")
  const [searchEmployeeGrades, setSearchEmployeeGrades] = useState("")
  const [searchEmployeeGradesInput, setSearchEmployeeGradesInput] = useState("")
  const [searchTunjanganKinerja, setSearchTunjanganKinerja] = useState("")
  const [searchTunjanganKinerjaInput, setSearchTunjanganKinerjaInput] = useState("")
  const [searchCalculation, setSearchCalculation] = useState("")
  const [searchCalculationInput, setSearchCalculationInput] = useState("")
  const [searchAttendance, setSearchAttendance] = useState("")
  const [searchAttendanceInput, setSearchAttendanceInput] = useState("")
  const [isSearchingEmployees, setIsSearchingEmployees] = useState(false)
  const [isSearchingTunjangan, setIsSearchingTunjangan] = useState(false)
  const [isSearchingAttendance, setIsSearchingAttendance] = useState(false)

  const [searchEmployeeAttendance, setSearchEmployeeAttendance] = useState("")
  const [searchEmployeeAttendanceInput, setSearchEmployeeAttendanceInput] = useState("")
  const [selectedEmployeeAttendance, setSelectedEmployeeAttendance] = useState<any[]>([])
  const [isSearchingEmployeeAttendance, setIsSearchingEmployeeAttendance] = useState(false)

  const [isMenuLoading, setIsMenuLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadEmployeeGrades()
    loadTunjanganKinerja()
  }, [])

  const loadEmployeeGrades = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("employee_grades").select("*").order("nama")

      if (error) {
        console.error("Error loading employee grades:", error)
        if (error.message.includes("table") && error.message.includes("employee_grades")) {
          setEmployeeGradeError(
            "Database table not found. Please run the setup script: scripts/create-employee-grades-table.sql",
          )
        } else {
          setEmployeeGradeError(`Failed to load employee grades: ${error.message}`)
        }
        return
      }

      setEmployeeGrades(data || [])
      console.log(`Loaded ${data?.length || 0} employee grades from database`)
    } catch (err) {
      console.error("Error loading employee grades:", err)
      setEmployeeGradeError("Failed to connect to database")
    }
  }

  const addEmployeeGrade = async () => {
    if (!newEmployee.nip || !newEmployee.nama || !newEmployee.golongan) {
      setEmployeeGradeError("All fields are required")
      return
    }

    setIsAddingEmployee(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("employee_grades")
        .insert([
          {
            nip: newEmployee.nip.trim(),
            nama: newEmployee.nama.trim(),
            golongan: newEmployee.golongan.trim(),
          },
        ])
        .select()

      if (error) {
        setEmployeeGradeError(`Failed to add employee: ${error.message}`)
        return
      }

      setNewEmployee({ nip: "", nama: "", golongan: "" })
      setEmployeeGradeError("")
      await loadEmployeeGrades() // Reload the list
    } catch (err) {
      console.error("Error adding employee:", err)
      setEmployeeGradeError("Failed to add employee")
    } finally {
      setIsAddingEmployee(false)
    }
  }

  const deleteEmployeeGrade = async (id: number) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("employee_grades").delete().eq("id", id)

      if (error) {
        setEmployeeGradeError(`Failed to delete employee: ${error.message}`)
        return
      }

      await loadEmployeeGrades() // Reload the list
    } catch (err) {
      console.error("Error deleting employee:", err)
      setEmployeeGradeError("Failed to delete employee")
    }
  }

  const getEmployeeGrade = (nama: string): EmployeeGrade | null => {
    const cleanedNama = nama.trim()
    console.log(`Looking up employee grade for name: '${cleanedNama}'`)
    const foundEmployee = employeeGrades.find((emp) => {
      console.log(`Comparing grade data name '${emp.nama.trim()}' with Excel name '${cleanedNama}'`)
      return emp.nama.trim() === cleanedNama
    })
    if (foundEmployee) {
      console.log(
        `Nama lookup: '${cleanedNama}' found. Matched Nama: '${foundEmployee.nama}' (Golongan: ${foundEmployee.golongan})`,
      )
      return foundEmployee
    } else {
      console.log(`Nama lookup: '${cleanedNama}' NOT found in grade data.`)
      return null
    }
  }

  const calculateRateAndTax = (golongan: string) => {
    const grade = golongan.toUpperCase()

    if (grade.startsWith("I/") || grade.startsWith("II/")) {
      return { rate: 35000, taxRate: 0 }
    } else if (grade.startsWith("III/")) {
      return { rate: 37000, taxRate: 0.05 }
    } else if (grade.startsWith("IV/")) {
      return { rate: 41000, taxRate: 0.15 }
    }

    // Default fallback
    return { rate: 35000, taxRate: 0 }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      setError("Please select a valid Excel file (.xlsx or .xls)")
      return
    }

    setIsLoading(true)
    setError("")
    setFileName(file.name)

    try {
      console.log("[v0] Starting Excel file upload:", file.name)
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      console.log("[v0] Workbook loaded, sheets:", workbook.SheetNames)

      const sheets: ExcelData = {}
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        sheets[sheetName] = jsonData as any[]

        if (sheetName === workbook.SheetNames[0]) {
          const actualHeaders = ((jsonData[0] as any[]) || []).map(String)
          console.log("[v0] First sheet headers:", actualHeaders.slice(0, 5))

          // Check first two columns are NAMA and NIP
          if (actualHeaders[0] !== "NAMA" || actualHeaders[1] !== "NIP") {
            throw new Error(
              `Invalid Excel structure. First two columns must be 'NAMA' and 'NIP'. Found: '${actualHeaders[0]}' and '${actualHeaders[1]}'`,
            )
          }

          console.log("[v0] Validation passed! NAMA and NIP columns found.")
        }
      })

      setExcelData(sheets)
      setActiveSheet(workbook.SheetNames[0] || "")
      console.log("[v0] Excel file loaded successfully")
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to parse Excel file. Please make sure it's a valid Excel file."
      setError(errorMessage)
      console.error("[v0] Excel parsing error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmployeeGradeFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      setEmployeeGradeError("Please select a valid Excel file (.xlsx or .xls) for employee grades.")
      return
    }

    setIsImporting(true)
    setEmployeeGradeError("")
    setEmployeeGrades([]) // Clear previous grades

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const sheetName = workbook.SheetNames[0] // Assume first sheet contains grades
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][]

      if (jsonData.length < 2) {
        throw new Error("Employee grade file is empty or only contains headers.")
      }

      const headers = jsonData[0].map(String).map((h) => h.trim().toUpperCase())
      const nipIndex = headers.indexOf("NIP")
      const namaIndex = headers.indexOf("NAMA")
      const golonganIndex = headers.indexOf("GOLONGAN")

      if (nipIndex === -1 || namaIndex === -1 || golonganIndex === -1) {
        throw new Error("Employee grade file must contain 'NIP', 'NAMA', and 'GOLONGAN' columns.")
      }

      const grades: EmployeeGrade[] = jsonData
        .slice(1)
        .map((row) => ({
          nip: row[nipIndex]?.toString().replace(/'/g, "").trim() || "",
          nama: row[namaIndex]?.toString().trim() || "",
          golongan: row[golonganIndex]?.toString().trim() || "",
        }))
        .filter((item) => item.nip && item.nama && item.golongan) // Ensure all fields are present

      // Insert grades into database with conflict handling
      let successCount = 0
      let errorCount = 0

      const supabase = createClient()
      for (const grade of grades) {
        const { error } = await supabase.from("employee_grades").upsert([grade], { onConflict: "nip" }).select()

        if (error) {
          console.error(`Failed to insert employee grade: ${grade.nama}`, error)
          errorCount++
        } else {
          successCount++
        }
      }

      await loadEmployeeGrades() // Reload the list
      setEmployeeGradeError("")
      console.log(`Import completed: ${successCount} successful, ${errorCount} errors`)

      // Reset file input
      event.target.value = ""
    } catch (error) {
      console.error("Error importing employee grades:", error)
      setEmployeeGradeError(error instanceof Error ? error.message : "Failed to import employee grades")
    } finally {
      setIsImporting(false)
    }
  }

  const handleAttendanceFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAttendance(true)
    setAttendanceError(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Store raw attendance data
      setRawAttendanceData(XLSX.utils.sheet_to_json(worksheet, { header: 1 }))

      const employeeAttendanceMap = new Map<string, Map<string, any[]>>()

      // First pass: group by employee and date
      jsonData.forEach((row: any) => {
        const nama = row.NAMA?.toString().trim()
        let nip = row.NIP_BARU?.toString().trim()
        if (nip && nip.startsWith("'")) {
          nip = nip.substring(1)
        }
        const tanggal = row.TANGGAL_WITA?.toString().trim()

        if (!nama || !nip || !tanggal) return

        const employeeKey = `${nip}-${nama}`

        if (!employeeAttendanceMap.has(employeeKey)) {
          employeeAttendanceMap.set(employeeKey, new Map())
        }

        const employeeData = employeeAttendanceMap.get(employeeKey)!
        if (!employeeData.has(tanggal)) {
          employeeData.set(tanggal, [])
        }

        employeeData.get(tanggal)!.push(row)
      })

      // Process attendance data with TL exemption
      const attendanceMap = new Map<string, AttendanceRecord>()

      employeeAttendanceMap.forEach((dateMap, employeeKey) => {
        const [nip, nama] = employeeKey.split("-")

        if (!attendanceMap.has(employeeKey)) {
          attendanceMap.set(employeeKey, {
            nama,
            nip,
            keterangan: "",
            totalDays: 0,
            attendanceCounts: {
              A: 0,
              T1: 0,
              T2: 0,
              T3: 0,
              T4: 0,
              P1: 0,
              P2: 0,
              P3: 0,
              P4: 0,
              CUTI: 0,
              TL: 0,
              HADIR: 0,
            },
            cutPercentage: 0,
            tunjanganBefore: 0,
            tunjanganAfter: 0,
            nominalCut: 0,
          })
        }

        const record = attendanceMap.get(employeeKey)!

        // Process each date
        dateMap.forEach((dayRecords, date) => {
          record.totalDays++

          const hasTL = dayRecords.some((row: any) => row.JENIS_CHECKIN?.toString().trim() === "TL")

          if (hasTL) {
            // Only count TL for this day, ignore all other attendance codes
            record.attendanceCounts.TL++
            return // Skip processing other codes for this day
          }

          // Process attendance for this date (only if no TL)
          dayRecords.forEach((row: any) => {
            const kategoriTerlambat = row.KATEGORI_TERLAMBAT?.toString().trim()
            const kategoriPulangCepat = row.KATEGORI_PULANG_CEPAT?.toString().trim()
            const jenisCheckin = row.JENIS_CHECKIN?.toString().trim()

            // Count attendance types (only if no TL on this day)
            if (jenisCheckin === "A" || !jenisCheckin) {
              record.attendanceCounts.A++
            } else if (jenisCheckin === "HADIR") {
              record.attendanceCounts.HADIR++
            } else if (jenisCheckin === "CUTI") {
              record.attendanceCounts.CUTI++
            }

            // Count late categories (only if no TL on this day)
            if (kategoriTerlambat === "T1") record.attendanceCounts.T1++
            else if (kategoriTerlambat === "T2") record.attendanceCounts.T2++
            else if (kategoriTerlambat === "T3") record.attendanceCounts.T3++
            else if (kategoriTerlambat === "T4") record.attendanceCounts.T4++

            // Count early leave categories (only if no TL on this day)
            if (kategoriPulangCepat === "P1") record.attendanceCounts.P1++
            else if (kategoriPulangCepat === "P2") record.attendanceCounts.P2++
            else if (kategoriPulangCepat === "P3") record.attendanceCounts.P3++
            else if (kategoriPulangCepat === "P4") record.attendanceCounts.P4++
          })
        })
      })

      // Calculate cuts and tunjangan
      const processedData = Array.from(attendanceMap.values()).map((record) => {
        // Calculate cut percentage
        let cutPercentage = 0
        cutPercentage += record.attendanceCounts.A * 5 // A = 5%
        cutPercentage += record.attendanceCounts.T1 * 0.5 // T1 = 0.5%
        cutPercentage += record.attendanceCounts.T2 * 1 // T2 = 1%
        cutPercentage += record.attendanceCounts.T3 * 1.5 // T3 = 1.5%
        cutPercentage += record.attendanceCounts.T4 * 2.5 // T4 = 2.5%
        cutPercentage += record.attendanceCounts.P1 * 0.5 // P1 = 0.5%
        cutPercentage += record.attendanceCounts.P2 * 1 // P2 = 1%
        cutPercentage += record.attendanceCounts.P3 * 1.5 // P3 = 1.5%
        cutPercentage += record.attendanceCounts.P4 * 2.5 // P4 = 2.5%

        // Find tunjangan kinerja for this employee
        const tkData = tunjanganKinerja.find((tk) => tk.nip === record.nip || tk.nama === record.nama)
        const tunjanganBefore = tkData ? tkData.tunjangan_kinerja : 0

        // Calculate after cut
        const tunjanganAfter = tunjanganBefore * (1 - cutPercentage / 100)
        const nominalCut = tunjanganBefore - tunjanganAfter

        // Create keterangan string
        const keterangan = `A:${record.attendanceCounts.A}, T1:${record.attendanceCounts.T1}, T2:${record.attendanceCounts.T2}, T3:${record.attendanceCounts.T3}, T4:${record.attendanceCounts.T4}, P1:${record.attendanceCounts.P1}, P2:${record.attendanceCounts.P2}, P3:${record.attendanceCounts.P3}, P4:${record.attendanceCounts.P4}, CUTI:${record.attendanceCounts.CUTI}, TL:${record.attendanceCounts.TL}, HADIR:${record.attendanceCounts.HADIR}`

        return {
          ...record,
          keterangan,
          cutPercentage,
          tunjanganBefore,
          tunjanganAfter,
          nominalCut,
        }
      })

      setAttendanceData(processedData)
      console.log("Attendance data processed:", processedData.length, "employees")
    } catch (error) {
      console.error("Error processing attendance file:", error)
      setAttendanceError("Error processing attendance file. Please check the file format.")
    } finally {
      setIsUploadingAttendance(false)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent, type: "main" | "grades") => {
    event.preventDefault()
    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (type === "main" && fileInputRef.current) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInputRef.current.files = dataTransfer.files
        handleFileUpload({ target: { files: dataTransfer.files } } as any)
      } else if (type === "grades" && employeeGradeFileInputRef.current) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        employeeGradeFileInputRef.current.files = dataTransfer.files
        handleEmployeeGradeFileUpload({
          target: { files: dataTransfer.files },
        } as any)
      }
    }
  }

  const handleDownloadTxt = () => {
    if (!excelData[activeSheet]) return
    const sheet = excelData[activeSheet]
    const headers = (sheet[0] || []).map(String)
    const dataRows = sheet.slice(1)
    const dateCols = headers.filter((h: string) => /^\d{1,2}$/.test(h)) // "01" to "31"
    const wfoEntries: string[] = []
    dataRows.forEach((row: any[]) => {
      const nip = row[headers.indexOf("NIP")]?.toString().replace(/'/g, "").trim()
      dateCols.forEach((col: string) => {
        const colIndex = headers.indexOf(col)
        const value = row[colIndex]?.toString().toUpperCase().trim()
        if (value === "WFO") {
          const date = `2025-07-${col.padStart(2, "0")}`
          wfoEntries.push(`${nip}\t${date}`)
        }
      })
    })
    const blob = new Blob([wfoEntries.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `WFO_${fileName.replace(/\.[^/.]+$/, "")}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const calculateUangMakan = (): CalculationResult[] => {
    if (!excelData[activeSheet] || employeeGrades.length === 0) {
      console.log("Cannot calculate: No active sheet data or employee grades data available.")
      return []
    }
    const sheet = excelData[activeSheet]
    const headers = (sheet[0] || []).map(String)
    const dataRows = sheet.slice(1)
    const dateCols = headers.filter((h: string) => /^\d{1,2}$/.test(h)) // "01" to "31"

    const results: CalculationResult[] = []

    dataRows.forEach((row: any[], rowIndex: number) => {
      const nama = row[headers.indexOf("NAMA")]?.toString().trim() || ""
      const nip = row[headers.indexOf("NIP")]?.toString().replace(/'/g, "").trim() || ""

      console.log(`Processing row ${rowIndex + 1}: Nama='${nama}', NIP='${nip}'`)

      const employeeGrade = getEmployeeGrade(nama)

      if (!employeeGrade) {
        console.warn(`Skipping employee with Nama: '${nama}' (NIP: '${nip}') - Name not found in grade data.`)
        return
      }

      let wfoDays = 0
      dateCols.forEach((col: string) => {
        const colIndex = headers.indexOf(col)
        const value = row[colIndex]?.toString().toUpperCase().trim()
        if (value === "WFO") {
          wfoDays++
        }
      })
      console.log(`  WFO Days for '${nama}': ${wfoDays}`)

      const { rate, taxRate } = calculateRateAndTax(employeeGrade.golongan)
      const baseAmount = wfoDays * rate
      const taxAmount = baseAmount * taxRate
      const totalUangMakan = baseAmount - taxAmount

      results.push({
        nama: employeeGrade.nama,
        nip,
        golongan: employeeGrade.golongan,
        wfoDays,
        baseAmount,
        taxAmount,
        totalUangMakan,
      })
      console.log(
        `  Calculated for '${nama}': Golongan=${employeeGrade.golongan}, Base=${baseAmount}, Tax=${taxAmount}, Total=${totalUangMakan}`,
      )
    })

    console.log("Calculated results count:", results.length)
    return results.sort((a, b) => a.nama.localeCompare(b.nama))
  }

  const handleDownloadCalculation = () => {
    const calculations = calculateUangMakan()

    const wb = XLSX.utils.book_new()

    const excelData = [
      ["NAMA", "NIP", "GOLONGAN", "HARI WFO", "TARIF PER HARI", "JUMLAH KOTOR", "PAJAK", "TOTAL UANG MAKAN"],
      ...calculations.map((calc) => [
        calc.nama,
        calc.nip,
        calc.golongan,
        calc.wfoDays,
        calc.baseAmount / calc.wfoDays || 0,
        calc.baseAmount,
        calc.taxAmount,
        calc.totalUangMakan,
      ]),
    ]

    const totalEmployees = calculations.length
    const grandTotalGross = calculations.reduce((sum, calc) => sum + calc.baseAmount, 0)
    const grandTotalTax = calculations.reduce((sum, calc) => sum + calc.taxAmount, 0)
    const grandTotalNet = calculations.reduce((sum, calc) => sum + calc.totalUangMakan, 0)

    excelData.push([])
    excelData.push(["SUMMARY", "", "", "", "", "", "", ""])
    excelData.push(["Total Employees", totalEmployees, "", "", "", "", "", ""])
    excelData.push(["Grand Total Gross", "", "", "", "", grandTotalGross, "", ""])
    excelData.push(["Grand Total Tax", "", "", "", "", "", grandTotalTax, ""])
    excelData.push(["Grand Total Net", "", "", "", "", "", "", grandTotalNet])

    const ws = XLSX.utils.aoa_to_sheet(excelData)

    ws["!cols"] = [
      { width: 30 },
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 20 },
    ]

    const range = XLSX.utils.decode_range(ws["!ref"] || "A1")
    for (let row = 1; row <= calculations.length; row++) {
      for (let col = 4; col <= 7; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (ws[cellAddress]) {
          ws[cellAddress].z = "#,##0"
        }
      }
    }

    const summaryStartRow = calculations.length + 3
    for (let row = summaryStartRow; row <= summaryStartRow + 3; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 5 })
      if (ws[cellAddress]) {
        ws[cellAddress].z = "#,##0"
      }
      const cellAddress2 = XLSX.utils.encode_cell({ r: row, c: 6 })
      if (ws[cellAddress2]) {
        ws[cellAddress2].z = "#,##0"
      }
      const cellAddress3 = XLSX.utils.encode_cell({ r: row, c: 7 })
      if (ws[cellAddress3]) {
        ws[cellAddress3].z = "#,##0"
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Uang Makan Calculation")
    XLSX.writeFile(wb, `Uang_Makan_${fileName.replace(/\.[^/.]+$/, "")}.xlsx`)
  }

  const currentSheetData = activeSheet ? excelData[activeSheet] : []
  const headers = currentSheetData.length > 0 ? currentSheetData[0] : []
  const rows = currentSheetData.slice(1)

  const loadTunjanganKinerja = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("tunjangan_kinerja").select("*").order("nama")

      if (error) {
        console.error("Error loading tunjangan kinerja:", error)
        if (error.message.includes("table") && error.message.includes("tunjangan_kinerja")) {
          setTunjanganKinerjaError(
            "Database table not found. Please run the setup script: scripts/create-tunjangan-kinerja-table.sql",
          )
        } else {
          setTunjanganKinerjaError(`Failed to load tunjangan kinerja: ${error.message}`)
        }
        return
      }

      setTunjanganKinerja(data || [])
      console.log(`Loaded ${data?.length || 0} tunjangan kinerja from database`)
    } catch (err) {
      console.error("Error loading tunjangan kinerja:", err)
      setTunjanganKinerjaError("Failed to connect to database")
    }
  }

  const addTunjanganKinerja = async () => {
    if (
      !newTunjanganKinerja.nip ||
      !newTunjanganKinerja.nama ||
      !newTunjanganKinerja.jabatan ||
      !newTunjanganKinerja.unit_kerja ||
      !newTunjanganKinerja.tunjangan_kinerja
    ) {
      setTunjanganKinerjaError("All fields are required")
      return
    }

    setIsAddingTunjanganKinerja(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("tunjangan_kinerja")
        .insert([
          {
            nip: newTunjanganKinerja.nip.trim(),
            nama: newTunjanganKinerja.nama.trim(),
            golongan: newTunjanganKinerja.jabatan.trim(), // Note: This is mapping jabatan to golongan based on existing code, might need adjustment
            kelas_jabatan: newTunjanganKinerja.unit_kerja.trim(), // Note: This is mapping unit_kerja to kelas_jabatan based on existing code, might need adjustment
            tunjangan_kinerja: Number.parseFloat(newTunjanganKinerja.tunjangan_kinerja),
          },
        ])
        .select()

      if (error) {
        setTunjanganKinerjaError(`Failed to add tunjangan kinerja: ${error.message}`)
        return
      }

      setNewTunjanganKinerja({
        nip: "",
        nama: "",
        jabatan: "",
        unit_kerja: "",
        tunjangan_kinerja: "",
      })
      setTunjanganKinerjaError("")
      await loadTunjanganKinerja()
    } catch (err) {
      console.error("Error adding tunjangan kinerja:", err)
      setTunjanganKinerjaError("Failed to add tunjangan kinerja")
    } finally {
      setIsAddingTunjanganKinerja(false)
    }
  }

  const deleteTunjanganKinerja = async (id: number) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("tunjangan_kinerja").delete().eq("id", id)

      if (error) {
        setTunjanganKinerjaError(`Failed to delete tunjangan kinerja: ${error.message}`)
        return
      }

      await loadTunjanganKinerja()
    } catch (err) {
      console.error("Error deleting tunjangan kinerja:", err)
      setTunjanganKinerjaError("Failed to delete tunjangan kinerja")
    }
  }

  const handleTunjanganKinerjaFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImportingTunjanganKinerja(true)
    setTunjanganKinerjaError("")

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][]

      if (jsonData.length < 2) {
        setTunjanganKinerjaError("File must contain at least a header row and one data row")
        return
      }

      const headers = jsonData[0].map((h: any) => h?.toString().toLowerCase().trim())
      const nipIndex = headers.findIndex((h: string) => h === "nip")
      const kdgradeIndex = headers.findIndex((h: string) => h === "kdgrade")
      const jumlahIndex = headers.findIndex((h: string) => h === "jumlah")
      const namaIndex = headers.findIndex((h: string) => h === "nama")

      if (nipIndex === -1 || kdgradeIndex === -1 || jumlahIndex === -1 || namaIndex === -1) {
        setTunjanganKinerjaError("File must contain columns: nip, kdgrade, jumlah, nama")
        return
      }

      const tunjanganKinerjaData = jsonData
        .slice(1)
        .map((row) => ({
          nip: row[nipIndex]?.toString().replace(/'/g, "").trim() || "",
          nama: row[namaIndex]?.toString().trim() || "",
          golongan: row[kdgradeIndex]?.toString().trim() || "", // Maps kdgrade to golongan
          kelas_jabatan: `Grade ${row[kdgradeIndex]?.toString().trim() || ""}`, // Creates kelas_jabatan from kdgrade
          tunjangan_kinerja: Number.parseFloat(row[jumlahIndex]?.toString().replace(/[^\d.-]/g, "") || "0"),
        }))
        .filter((item) => item.nip && item.nama && item.golongan && item.tunjangan_kinerja > 0)

      let successCount = 0
      let errorCount = 0

      const supabase = createClient()
      for (const data of tunjanganKinerjaData) {
        const { error } = await supabase.from("tunjangan_kinerja").upsert([data], { onConflict: "nip" }).select()

        if (error) {
          console.error(`Failed to insert tunjangan kinerja: ${data.nama}`, error)
          errorCount++
        } else {
          successCount++
        }
      }

      await loadTunjanganKinerja()
      setTunjanganKinerjaError("")
      console.log(`Import completed: ${successCount} successful, ${errorCount} errors`)

      event.target.value = ""
    } catch (error) {
      console.error("Error importing tunjangan kinerja:", error)
      setTunjanganKinerjaError(error instanceof Error ? error.message : "Failed to import tunjangan kinerja")
    } finally {
      setIsImportingTunjanganKinerja(false)
    }
  }

  const calculateTunjanganKinerja = () => {
    if (Object.keys(excelData).length === 0) {
      alert("Please upload an Excel file first")
      return
    }

    if (tunjanganKinerja.length === 0) {
      alert("No tunjangan kinerja data available. Please add some data first.")
      return
    }

    const results: TunjanganKinerjaResult[] = []

    // Iterate through all sheets in the uploaded Excel file
    Object.entries(excelData).forEach(([sheetName, data]) => {
      if (data.length < 2) return // Skip if sheet has only headers or is empty

      const headers = data[0].map((h: any) => h?.toString().toLowerCase().trim())
      const namaIndex = headers.findIndex((h: string) => h.includes("nama"))

      // If 'nama' column is not found in the sheet, skip this sheet
      if (namaIndex === -1) return

      data.slice(1).forEach((row: any[]) => {
        const nama = row[namaIndex]?.toString().trim()
        if (!nama) return // Skip if nama is empty

        // Find corresponding tunjangan kinerja data by name
        const tunjanganData = tunjanganKinerja.find((tk) => tk.nama.toLowerCase().trim() === nama.toLowerCase().trim())

        if (tunjanganData) {
          // Count attendance: number of non-empty cells excluding the name column
          const attendanceCount = row.filter(
            (cell, index) =>
              index !== namaIndex && // Exclude the name column
              cell !== null &&
              cell !== undefined &&
              cell.toString().trim() !== "", // Count non-empty cells
          ).length

          // Calculate tunjangan kinerja based on attendance
          // Assuming total working days are the number of columns minus the name column
          const totalWorkingDays = headers.length - 1 // Exclude name column from total count
          const attendanceRatio = totalWorkingDays > 0 ? attendanceCount / totalWorkingDays : 0
          const calculatedTunjangan = tunjanganData.tunjangan_kinerja * attendanceRatio

          results.push({
            nama: tunjanganData.nama,
            nip: tunjanganData.nip,
            jabatan: tunjanganData.jabatan,
            unit_kerja: tunjanganData.unit_kerja,
            tunjangan_kinerja_full: tunjanganData.tunjangan_kinerja,
            total_absensi: attendanceCount, // This actually counts filled cells, not necessarily 'absences'
            tunjangan_kinerja_calculated: Math.round(calculatedTunjangan),
          })
        }
      })
    })

    setTunjanganKinerjaResults(results)
    console.log("Tunjangan Kinerja calculation completed:", results)
  }

  const downloadTunjanganKinerjaResults = () => {
    if (attendanceData.length === 0) return

    const wb = XLSX.utils.book_new()
    const wsData = [
      ["Nama", "NIP", "Keterangan", "Cut Percentage", "Tunjangan Before", "Nominal Cut", "Tunjangan After"],
      ...attendanceData.map((record) => [
        record.nama,
        record.nip,
        record.keterangan,
        `${record.cutPercentage.toFixed(1)}%`,
        record.tunjanganBefore,
        Math.round(record.nominalCut),
        Math.round(record.tunjanganAfter),
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, "Tunjangan Kinerja Results")

    // Create blob and download in browser
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "tunjangan-kinerja-calculation.xlsx"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleMenuChange = async (
    menu: "viewer" | "calculator" | "employee-data" | "tunjangan-kinerja" | "website",
  ) => {
    setIsMenuLoading(true)
    setIsMobileMenuOpen(false) // Close mobile menu when navigating
    await new Promise((resolve) => setTimeout(resolve, 300)) // Smooth transition
    setActiveMenu(menu)
    setIsMenuLoading(false)
  }

  const filteredExcelData = Object.entries(excelData).filter(([key, value]) => {
    if (!searchExcel) return true
    return (
      key.toLowerCase().includes(searchExcel.toLowerCase()) ||
      value.some((row: any) =>
        Object.values(row).some((cell: any) => String(cell).toLowerCase().includes(searchExcel.toLowerCase())),
      )
    )
  })

  const filteredEmployeeGrades = useMemo(() => {
    return employeeGrades.filter((employee) => {
      if (!searchEmployeeGrades) return true
      return (
        employee.nama.toLowerCase().includes(searchEmployeeGrades.toLowerCase()) ||
        employee.nip.toLowerCase().includes(searchEmployeeGrades.toLowerCase()) ||
        employee.golongan.toLowerCase().includes(searchEmployeeGrades.toLowerCase())
      )
    })
  }, [employeeGrades, searchEmployeeGrades])

  const filteredTunjanganKinerja = useMemo(() => {
    return tunjanganKinerja.filter((tk) => {
      if (!searchTunjanganKinerja) return true
      return (
        tk.nama.toLowerCase().includes(searchTunjanganKinerja.toLowerCase()) ||
        tk.nip.toLowerCase().includes(searchTunjanganKinerja.toLowerCase()) ||
        tk.jabatan.toLowerCase().includes(searchTunjanganKinerja.toLowerCase()) ||
        tk.unit_kerja.toLowerCase().includes(searchTunjanganKinerja.toLowerCase())
      )
    })
  }, [tunjanganKinerja, searchTunjanganKinerja])

  const calculationResults = useMemo(() => {
    return calculateUangMakan()
  }, [excelData, activeSheet, employeeGrades])

  const filteredCalculationData = useMemo(() => {
    return calculationResults.filter((calc) => {
      if (!searchCalculation) return true
      return (
        calc.nama.toLowerCase().includes(searchCalculation.toLowerCase()) ||
        calc.nip.toLowerCase().includes(searchCalculation.toLowerCase()) ||
        calc.golongan.toLowerCase().includes(searchCalculation.toLowerCase())
      )
    })
  }, [calculationResults, searchCalculation])

  const filteredAttendanceData = useMemo(() => {
    return attendanceData.filter((record) => {
      if (!searchAttendance) return true
      return (
        record.nama.toLowerCase().includes(searchAttendance.toLowerCase()) ||
        record.nip.toLowerCase().includes(searchAttendance.toLowerCase()) ||
        record.keterangan.toLowerCase().includes(searchAttendance.toLowerCase())
      )
    })
  }, [attendanceData, searchAttendance])

  const searchEmployeeAttendanceDetails = (employeeName: string) => {
    if (!employeeName.trim()) {
      setSelectedEmployeeAttendance([])
      return
    }

    setIsSearchingEmployeeAttendance(true)

    setTimeout(() => {
      const employeeAttendanceDetails: any[] = []

      console.log("[v0] Searching for employee:", employeeName)
      console.log("[v0] Raw attendance data length:", rawAttendanceData.length)

      // Search through the processed attendance data instead of raw Excel data
      if (rawAttendanceData.length > 0) {
        const headers = rawAttendanceData[0]
        const namaIndex = headers.findIndex((h: any) => h?.toString().toLowerCase().includes("nama"))
        const nipIndex = headers.findIndex((h: any) => h?.toString().toLowerCase().includes("nip"))
        const tanggalIndex = headers.findIndex((h: any) => h?.toString().toLowerCase().includes("tanggal"))
        const jenisCheckinIndex = headers.findIndex((h: any) => h?.toString().toLowerCase().includes("jenis_checkin"))
        const kategoriTerlambatIndex = headers.findIndex((h: any) =>
          h?.toString().toLowerCase().includes("kategori_terlambat"),
        )
        const kategoriPulangCepatIndex = headers.findIndex((h: any) =>
          h?.toString().toLowerCase().includes("kategori_pulang_cepat"),
        )

        console.log("[v0] Column indices - nama:", namaIndex, "nip:", nipIndex)

        if (namaIndex !== -1) {
          rawAttendanceData.slice(1).forEach((row: any[]) => {
            const nama = row[namaIndex]?.toString().trim()
            const nip = nipIndex !== -1 ? row[nipIndex]?.toString().trim() : ""

            const searchTerm = employeeName.toLowerCase()
            const nameMatch = nama && nama.toLowerCase().includes(searchTerm)
            const nipMatch = nip && nip.toLowerCase().includes(searchTerm)

            if (!nameMatch && !nipMatch) return

            const tanggal = tanggalIndex !== -1 ? row[tanggalIndex]?.toString().trim() : ""
            const jenisCheckin = jenisCheckinIndex !== -1 ? row[jenisCheckinIndex]?.toString().trim() : ""
            const kategoriTerlambat =
              kategoriTerlambatIndex !== -1 ? row[kategoriTerlambatIndex]?.toString().trim() : ""
            const kategoriPulangCepat =
              kategoriPulangCepatIndex !== -1 ? row[kategoriPulangCepatIndex]?.toString().trim() : ""

            // Determine attendance status
            let attendanceStatus = jenisCheckin || "HADIR"
            if (kategoriTerlambat) attendanceStatus += ` (${kategoriTerlambat})`
            if (kategoriPulangCepat) attendanceStatus += ` (${kategoriPulangCepat})`

            employeeAttendanceDetails.push({
              nama: nama,
              nip: nip,
              tanggal: tanggal,
              keterangan: attendanceStatus,
              jenisCheckin: jenisCheckin,
              kategoriTerlambat: kategoriTerlambat,
              kategoriPulangCepat: kategoriPulangCepat,
            })
          })
        }
      }

      console.log("[v0] Found attendance records:", employeeAttendanceDetails.length)
      setSelectedEmployeeAttendance(employeeAttendanceDetails)
      setIsSearchingEmployeeAttendance(false)
    }, 300)
  }

  const handleEmployeeSearch = () => {
    setIsSearchingEmployees(true)
    setSearchEmployeeGrades(searchEmployeeGradesInput)
    setTimeout(() => setIsSearchingEmployees(false), 300)
  }

  const handleTunjanganSearch = () => {
    setIsSearchingTunjangan(true)
    setSearchTunjanganKinerja(searchTunjanganKinerjaInput)
    setTimeout(() => setIsSearchingTunjangan(false), 300)
  }

  const handleAttendanceSearch = () => {
    setIsSearchingAttendance(true)
    setSearchAttendance(searchAttendanceInput)
    setTimeout(() => setIsSearchingAttendance(false), 300)
  }

  const handleCalculationSearch = () => {
    setSearchCalculation(searchCalculationInput)
  }

  const handleEmployeeAttendanceSearch = () => {
    setIsSearchingEmployeeAttendance(true)
    setSearchEmployeeAttendance(searchEmployeeAttendanceInput)
    setTimeout(() => setIsSearchingEmployeeAttendance(false), 300)
  }

  const filteredEmployeeAttendanceData = useMemo(() => {
    if (!searchEmployeeAttendance) {
      setSelectedEmployeeAttendance([])
      return []
    }

    if (!excelData || !activeSheet || !excelData[activeSheet]) {
      return []
    }

    const data = excelData[activeSheet]

    if (data.length === 0) return []

    const headers = data[0]
    const namaIndex = headers.findIndex((h) => h && h.toString().toLowerCase().includes("nama"))
    const nipIndex = headers.findIndex((h) => h && h.toString().toLowerCase().includes("nip"))

    if (namaIndex === -1 && nipIndex === -1) {
      return []
    }

    const employeeAttendanceDetails = []

    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const employeeName = row[namaIndex] ? row[namaIndex].toString() : ""
      const employeeNip = row[nipIndex] ? row[nipIndex].toString() : ""

      const searchTerm = searchEmployeeAttendance.toLowerCase()
      const nameMatch = employeeName.toLowerCase().includes(searchTerm)
      const nipMatch = employeeNip.toLowerCase().includes(searchTerm)

      if (nameMatch || nipMatch) {
        const attendanceRecord = {
          nama: employeeName,
          nip: employeeNip,
          tanggal: row[3] || "", // Assuming tanggal is at index 3
          jam_masuk: row[4] || "", // Assuming jam_masuk is at index 4
          jam_keluar: row[5] || "", // Assuming jam_keluar is at index 5
          keterangan: row[6] || "", // Assuming keterangan is at index 6
          durasi_kerja: row[7] || "", // Assuming durasi_kerja is at index 7
        }
        employeeAttendanceDetails.push(attendanceRecord)
      }
    }

    return employeeAttendanceDetails
  }, [excelData, activeSheet, searchEmployeeAttendance])

  useEffect(() => {
    setSelectedEmployeeAttendance(filteredEmployeeAttendanceData)
  }, [filteredEmployeeAttendanceData])

  return (
    <div className="min-h-screen bg-background">
      {isMenuLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 flex items-center space-x-3 shadow-xl border border-border">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
            <span className="text-foreground font-medium">Loading...</span>
          </div>
        </div>
      )}

      <nav className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Pengolahan Data Absensi</h1>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-2">
              <button
                onClick={() => handleMenuChange("viewer")}
                disabled={isMenuLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeMenu === "viewer"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                } ${isMenuLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                ADK Uang Makan
              </button>
              <button
                onClick={() => handleMenuChange("employee-data")}
                disabled={isMenuLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  activeMenu === "employee-data"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                } ${isMenuLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Database className="w-4 h-4" />
                <span>Employee Data</span>
              </button>
              <button
                onClick={() => handleMenuChange("tunjangan-kinerja")}
                disabled={isMenuLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  activeMenu === "tunjangan-kinerja"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                } ${isMenuLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Calculator className="w-4 h-4" />
                <span>Tunjangan Kinerja</span>
              </button>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1">
              <button
                onClick={() => handleMenuChange("viewer")}
                disabled={isMenuLoading}
                className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeMenu === "viewer"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                } ${isMenuLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                ADK Uang Makan
              </button>
              <button
                onClick={() => handleMenuChange("employee-data")}
                disabled={isMenuLoading}
                className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  activeMenu === "employee-data"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                } ${isMenuLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Database className="w-4 h-4" />
                <span>Employee Data</span>
              </button>
              <button
                onClick={() => handleMenuChange("tunjangan-kinerja")}
                disabled={isMenuLoading}
                className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  activeMenu === "tunjangan-kinerja"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                } ${isMenuLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Calculator className="w-4 h-4" />
                <span>Tunjangan Kinerja</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            {activeMenu === "viewer" && "ADK Uang Makan"}
            {activeMenu === "employee-data" && "Employee Grade Data"}
            {activeMenu === "tunjangan-kinerja" && "Tunjangan Kinerja"}
          </h2>
          <p className="text-muted-foreground text-base">
            {activeMenu === "viewer" &&
              "Generate dokumen uang makan sesuai format ADK dan hitung uang makan berdasarkan data kehadiran"}
            {activeMenu === "employee-data" && "Manage employee grade data in the database"}
            {activeMenu === "tunjangan-kinerja" && "Manage tunjangan kinerja data and calculate based on attendance"}
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{employeeGrades.length}</span> employees
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{tunjanganKinerja.length}</span> tunjangan records
              </span>
            </div>
          </div>
        </div>

        {activeMenu === "viewer" && (
          <>
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Upload Excel File</CardTitle>
                    <CardDescription>Select an Excel file (.xlsx or .xls) to view its contents</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    {isLoading ? "Processing file..." : "Choose an Excel file or drag it here"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">Supports .xlsx and .xls files</p>
                  <Button
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6"
                  >
                    {isLoading ? "Processing..." : "Select File"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {error && (
                  <Alert className="mt-6 border-destructive/50 bg-destructive/10" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {fileName && !error && (
                  <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-foreground font-medium">
                      <strong>File loaded:</strong> {fileName}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {Object.keys(excelData).length > 0 && (
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b border-border bg-muted/30">
                  <CardTitle className="text-lg">Excel Data</CardTitle>
                  <CardDescription>
                    {Object.keys(excelData).length > 1 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-sm text-muted-foreground">Sheets:</span>
                        {Object.keys(excelData).map((sheetName) => (
                          <Button
                            key={sheetName}
                            variant={activeSheet === sheetName ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveSheet(sheetName)}
                            className={`
                              ${
                                activeSheet === sheetName
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                              }
                            `}
                          >
                            {sheetName}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      `Showing data from: ${activeSheet}`
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentSheetData.length > 0 ? (
                    <div className="overflow-auto max-h-96 border border-input rounded-xl">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border">
                            {headers.map((header: any, index: number) => (
                              <TableHead key={index} className="font-semibold text-foreground">
                                {header || `Column ${index + 1}`}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row: any[], rowIndex: number) => (
                            <TableRow key={rowIndex} className="border-b border-border hover:bg-muted/50">
                              {headers.map((_: any, colIndex: number) => (
                                <TableCell key={colIndex} className="text-sm">
                                  {row[colIndex] !== undefined ? String(row[colIndex]) : ""}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No data found in the selected sheet</p>
                    </div>
                  )}

                  {rows.length > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {rows.length} rows × {headers.length} columns
                      </div>
                      <Button
                        onClick={handleDownloadTxt}
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Generate WFO File (.txt)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Calculation results card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Uang Makan Calculation</CardTitle>
                    <CardDescription>Calculate uang makan based on attendance data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, NIP, or golongan..."
                      className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      value={searchCalculationInput}
                      onChange={(e) => setSearchCalculationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCalculationSearch()
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleCalculationSearch}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    Search
                  </Button>
                </div>

                <div className="overflow-auto mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="font-semibold text-foreground">Nama</TableHead>
                        <TableHead className="font-semibold text-foreground">NIP</TableHead>
                        <TableHead className="font-semibold text-foreground">Golongan</TableHead>
                        <TableHead className="font-semibold text-foreground">WFO Days</TableHead>
                        <TableHead className="font-semibold text-foreground">Base Amount</TableHead>
                        <TableHead className="font-semibold text-foreground">Tax Amount</TableHead>
                        <TableHead className="font-semibold text-foreground">Total Uang Makan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalculationData.map((calc, index) => (
                        <TableRow key={index} className="border-b border-border hover:bg-muted/50">
                          <TableCell>{calc.nama}</TableCell>
                          <TableCell className="font-mono text-sm">{calc.nip}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                              {calc.golongan}
                            </span>
                          </TableCell>
                          <TableCell>{calc.wfoDays}</TableCell>
                          <TableCell className="text-right font-mono">{calc.baseAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">
                            {calc.taxAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono">
                            {calc.totalUangMakan.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  onClick={handleDownloadCalculation}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Calculation
                </Button>
              </CardContent>
            </Card>

            {/* Upload attendance data card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Upload Attendance Data</CardTitle>
                    <CardDescription>Upload attendance data from an Excel file</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                  onDragOver={handleDragOver}
                  onClick={() => attendanceFileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    {isUploadingAttendance ? "Processing file..." : "Choose an Excel file or drag it here"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">Supports .xlsx and .xls files</p>
                  <Button
                    disabled={isUploadingAttendance}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6"
                  >
                    {isUploadingAttendance ? "Processing..." : "Select File"}
                  </Button>
                  <input
                    ref={attendanceFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleAttendanceFileUpload}
                    className="hidden"
                  />
                </div>

                {attendanceError && (
                  <Alert className="mt-6 border-destructive/50 bg-destructive/10" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{attendanceError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Attendance data card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Search Attendance Data</CardTitle>
                    <CardDescription>Search by name, NIP, or keterangan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, NIP, or keterangan..."
                      className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      value={searchAttendanceInput}
                      onChange={(e) => setSearchAttendanceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAttendanceSearch()
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleAttendanceSearch}
                    disabled={isSearchingAttendance}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    {isSearchingAttendance ? "Searching..." : "Search"}
                  </Button>
                </div>

                <div className="overflow-auto mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="font-semibold text-foreground">Nama</TableHead>
                        <TableHead className="font-semibold text-foreground">NIP</TableHead>
                        <TableHead className="font-semibold text-foreground">Keterangan</TableHead>
                        <TableHead className="font-semibold text-foreground">Cut Percentage</TableHead>
                        <TableHead className="font-semibold text-foreground">Tunjangan Before</TableHead>
                        <TableHead className="font-semibold text-foreground">Nominal Cut</TableHead>
                        <TableHead className="font-semibold text-foreground">Tunjangan After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendanceData.map((record, index) => (
                        <TableRow key={index} className="border-b border-border hover:bg-muted/50">
                          <TableCell>{record.nama}</TableCell>
                          <TableCell className="font-mono text-sm">{record.nip}</TableCell>
                          <TableCell>{record.keterangan}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                              {record.cutPercentage.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="font-mono">{record.tunjanganBefore.toLocaleString()}</TableCell>
                          <TableCell className="font-mono">{Math.round(record.nominalCut).toLocaleString()}</TableCell>
                          <TableCell className="font-bold font-mono">
                            {Math.round(record.tunjanganAfter).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  onClick={downloadTunjanganKinerjaResults}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Tunjangan Kinerja Results
                </Button>
              </CardContent>
            </Card>

            {/* Search employee attendance details card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Search Employee Attendance</CardTitle>
                    <CardDescription>Search employee attendance details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by employee name or NIP..."
                      className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      value={searchEmployeeAttendanceInput}
                      onChange={(e) => {
                        setSearchEmployeeAttendanceInput(e.target.value)
                        searchEmployeeAttendanceDetails(e.target.value)
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleEmployeeAttendanceSearch}
                    disabled={isSearchingEmployeeAttendance}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    {isSearchingEmployeeAttendance ? "Searching..." : "Search"}
                  </Button>
                </div>

                {selectedEmployeeAttendance.length > 0 && (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border">
                          <TableHead className="font-semibold text-foreground">Nama</TableHead>
                          <TableHead className="font-semibold text-foreground">NIP</TableHead>
                          <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                          <TableHead className="font-semibold text-foreground">Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmployeeAttendance.map((attendance, index) => (
                          <TableRow key={index} className="border-b border-border hover:bg-muted/50">
                            <TableCell>{attendance.nama}</TableCell>
                            <TableCell className="font-mono text-sm">{attendance.nip}</TableCell>
                            <TableCell className="text-sm">{attendance.tanggal}</TableCell>
                            <TableCell>{attendance.keterangan}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeMenu === "employee-data" && (
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Import Employee Data</CardTitle>
                    <CardDescription>Import employee data from an Excel file</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "grades")}
                  onClick={() => employeeGradeFileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    {isImporting ? "Importing data..." : "Choose an Excel file or drag it here"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">Supports .xlsx and .xls files</p>
                  <Button
                    disabled={isImporting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6"
                  >
                    {isImporting ? "Importing..." : "Select File"}
                  </Button>
                  <input
                    ref={employeeGradeFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleEmployeeGradeFileUpload}
                    className="hidden"
                  />
                </div>

                {employeeGradeError && (
                  <Alert className="mt-6 border-destructive/50 bg-destructive/10" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{employeeGradeError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Add New Employee</CardTitle>
                    <CardDescription>Manually add a new employee grade</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label htmlFor="nip" className="text-sm font-medium text-foreground">
                        NIP
                      </label>
                      <input
                        type="text"
                        id="nip"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="Enter NIP"
                        value={newEmployee.nip}
                        onChange={(e) => setNewEmployee({ ...newEmployee, nip: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="nama" className="text-sm font-medium text-foreground">
                        Nama
                      </label>
                      <input
                        type="text"
                        id="nama"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="Enter name"
                        value={newEmployee.nama}
                        onChange={(e) => setNewEmployee({ ...newEmployee, nama: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="golongan" className="text-sm font-medium text-foreground">
                      Golongan
                    </label>
                    <input
                      type="text"
                      id="golongan"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      placeholder="Enter golongan"
                      value={newEmployee.golongan}
                      onChange={(e) => setNewEmployee({ ...newEmployee, golongan: e.target.value })}
                    />
                  </div>
                  <Button
                    disabled={isAddingEmployee}
                    onClick={addEmployeeGrade}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    {isAddingEmployee ? "Adding..." : "Add Employee"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Search Employee Grades</CardTitle>
                    <CardDescription>Search by name, NIP, or golongan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, NIP, or golongan..."
                      className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      value={searchEmployeeGradesInput}
                      onChange={(e) => setSearchEmployeeGradesInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEmployeeSearch()
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleEmployeeSearch}
                    disabled={isSearchingEmployees}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    {isSearchingEmployees ? "Searching..." : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="text-lg">Employee Grades</CardTitle>
                <CardDescription>List of employee grades ({filteredEmployeeGrades.length} records)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="font-semibold text-foreground">NIP</TableHead>
                        <TableHead className="font-semibold text-foreground">Nama</TableHead>
                        <TableHead className="font-semibold text-foreground">Golongan</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployeeGrades.map((employee) => (
                        <TableRow key={employee.id} className="border-b border-border hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">{employee.nip}</TableCell>
                          <TableCell>{employee.nama}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                              {employee.golongan}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEmployeeGrade(employee.id as number)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tunjangan Kinerja section */}
        {activeMenu === "tunjangan-kinerja" && (
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Import Tunjangan Kinerja Data</CardTitle>
                    <CardDescription>Import tunjangan kinerja data from an Excel file</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                  onDragOver={handleDragOver}
                  onClick={() => tunjanganKinerjaFileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    {isImportingTunjanganKinerja ? "Importing data..." : "Choose an Excel file or drag it here"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">Supports .xlsx and .xls files</p>
                  <Button
                    disabled={isImportingTunjanganKinerja}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6"
                    onClick={() => tunjanganKinerjaFileInputRef.current?.click()}
                  >
                    {isImportingTunjanganKinerja ? "Importing..." : "Select File"}
                  </Button>
                  <input
                    ref={tunjanganKinerjaFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleTunjanganKinerjaFileUpload}
                    className="hidden"
                  />
                </div>

                {tunjanganKinerjaError && (
                  <Alert className="mt-6 border-destructive/50 bg-destructive/10" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{tunjanganKinerjaError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Add tunjangan kinerja card with modern form */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Add New Tunjangan Kinerja</CardTitle>
                    <CardDescription>Manually add new tunjangan kinerja data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label htmlFor="nip" className="text-sm font-medium text-foreground">
                        NIP
                      </label>
                      <input
                        type="text"
                        id="nip"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="Enter NIP"
                        value={newTunjanganKinerja.nip}
                        onChange={(e) => setNewTunjanganKinerja({ ...newTunjanganKinerja, nip: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="nama" className="text-sm font-medium text-foreground">
                        Nama
                      </label>
                      <input
                        type="text"
                        id="nama"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="Enter name"
                        value={newTunjanganKinerja.nama}
                        onChange={(e) => setNewTunjanganKinerja({ ...newTunjanganKinerja, nama: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label htmlFor="jabatan" className="text-sm font-medium text-foreground">
                        Jabatan
                      </label>
                      <input
                        type="text"
                        id="jabatan"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="Enter jabatan"
                        value={newTunjanganKinerja.jabatan}
                        onChange={(e) => setNewTunjanganKinerja({ ...newTunjanganKinerja, jabatan: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="unit_kerja" className="text-sm font-medium text-foreground">
                        Unit Kerja
                      </label>
                      <input
                        type="text"
                        id="unit_kerja"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="Enter unit kerja"
                        value={newTunjanganKinerja.unit_kerja}
                        onChange={(e) => setNewTunjanganKinerja({ ...newTunjanganKinerja, unit_kerja: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="tunjangan_kinerja" className="text-sm font-medium text-foreground">
                      Tunjangan Kinerja
                    </label>
                    <input
                      type="number"
                      id="tunjangan_kinerja"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      placeholder="Enter tunjangan kinerja amount"
                      value={newTunjanganKinerja.tunjangan_kinerja}
                      onChange={(e) =>
                        setNewTunjanganKinerja({ ...newTunjanganKinerja, tunjangan_kinerja: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    disabled={isAddingTunjanganKinerja}
                    onClick={addTunjanganKinerja}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    {isAddingTunjanganKinerja ? "Adding..." : "Add Tunjangan Kinerja"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Search Tunjangan Kinerja</CardTitle>
                    <CardDescription>Search by name, NIP, jabatan, or unit kerja</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, NIP, jabatan, or unit kerja..."
                      className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      value={searchTunjanganKinerjaInput}
                      onChange={(e) => setSearchTunjanganKinerjaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleTunjanganSearch()
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleTunjanganSearch}
                    disabled={isSearchingTunjangan}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    {isSearchingTunjangan ? "Searching..." : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tunjangan Kinerja list with modern table */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="text-lg">Tunjangan Kinerja Data</CardTitle>
                <CardDescription>
                  List of tunjangan kinerja data ({filteredTunjanganKinerja.length} records)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="font-semibold text-foreground">NIP</TableHead>
                        <TableHead className="font-semibold text-foreground">Nama</TableHead>
                        <TableHead className="font-semibold text-foreground">Jabatan</TableHead>
                        <TableHead className="font-semibold text-foreground">Unit Kerja</TableHead>
                        <TableHead className="font-semibold text-foreground">Tunjangan Kinerja</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTunjanganKinerja.map((tk) => (
                        <TableRow key={tk.id} className="border-b border-border hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">{tk.nip}</TableCell>
                          <TableCell>{tk.nama}</TableCell>
                          <TableCell>{tk.jabatan}</TableCell>
                          <TableCell>{tk.unit_kerja}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                              {tk.tunjangan_kinerja}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTunjanganKinerja(tk.id as number)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Calculate Tunjangan Kinerja card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Calculate Tunjangan Kinerja</CardTitle>
                    <CardDescription>Calculate tunjangan kinerja based on attendance data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Button
                  onClick={calculateTunjanganKinerja}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium mb-6"
                >
                  Calculate Tunjangan Kinerja
                </Button>

                {tunjanganKinerjaResults.length > 0 && (
                  <>
                    <div className="overflow-auto mb-6">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="font-semibold text-foreground">Nama</TableHead>
                            <TableHead className="font-semibold text-foreground">NIP</TableHead>
                            <TableHead className="font-semibold text-foreground">Jabatan</TableHead>
                            <TableHead className="font-semibold text-foreground">Unit Kerja</TableHead>
                            <TableHead className="font-semibold text-foreground">Tunjangan Kinerja Full</TableHead>
                            <TableHead className="font-semibold text-foreground">Total Absensi</TableHead>
                            <TableHead className="font-semibold text-foreground">
                              Tunjangan Kinerja Calculated
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tunjanganKinerjaResults.map((result, index) => (
                            <TableRow key={index} className="border-b border-border hover:bg-muted/50">
                              <TableCell>{result.nama}</TableCell>
                              <TableCell className="font-mono text-sm">{result.nip}</TableCell>
                              <TableCell>{result.jabatan}</TableCell>
                              <TableCell>{result.unit_kerja}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                                  {result.tunjangan_kinerja_full}
                                </span>
                              </TableCell>
                              <TableCell>{result.total_absensi}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                                  {result.tunjangan_kinerja_calculated}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      onClick={downloadTunjanganKinerjaResults}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Results
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
