"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import { Upload, FileSpreadsheet, AlertCircle, Search, Plus, Trash2 } from "lucide-react"
import * as XLSX from "xlsx"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

interface EmployeeGrade {
  id?: number
  nip: string
  nama: string
  golongan: string
}

export default function EmployeeDataPage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [employeeGrades, setEmployeeGrades] = useState<EmployeeGrade[]>([])
  const [employeeGradeError, setEmployeeGradeError] = useState<string>("")
  const [newEmployee, setNewEmployee] = useState({
    nip: "",
    nama: "",
    golongan: "",
  })
  const [isAddingEmployee, setIsAddingEmployee] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const employeeGradeFileInputRef = useRef<HTMLInputElement>(null)

  const [searchEmployeeGrades, setSearchEmployeeGrades] = useState("")
  const [searchEmployeeGradesInput, setSearchEmployeeGradesInput] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

  const totalPages = Math.ceil(filteredEmployeeGrades.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployeeGrades = filteredEmployeeGrades.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchEmployeeGrades])

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
      } else {
        setIsAuthenticated(true)
      }
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      loadEmployeeGrades()
    }
  }, [isAuthenticated])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const loadEmployeeGrades = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("employee_grades").select("*").order("nama", { ascending: true })

      if (error) throw error
      setEmployeeGrades(data || [])
    } catch (err: any) {
      setEmployeeGradeError(err.message || "Failed to load employee grades")
      console.error("Error loading employee grades:", err)
    }
  }

  const handleEmployeeGradeFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setEmployeeGradeError("")

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const supabase = createClient()
      for (const row of jsonData) {
        const { error } = await supabase.from("employee_grades").upsert(
          {
            nip: String(row.NIP || row.nip),
            nama: String(row.NAMA || row.nama),
            golongan: String(row.GOLONGAN || row.golongan),
          },
          { onConflict: "nip" },
        )

        if (error) throw error
      }

      await loadEmployeeGrades()
      alert("Employee data imported successfully!")
    } catch (err: any) {
      setEmployeeGradeError(err.message || "Failed to import employee data")
      console.error("Error importing employee data:", err)
    } finally {
      setIsImporting(false)
      if (event.target) {
        event.target.value = ""
      }
    }
  }

  const addEmployeeGrade = async () => {
    if (!newEmployee.nip || !newEmployee.nama || !newEmployee.golongan) {
      alert("Please fill in all fields")
      return
    }

    setIsAddingEmployee(true)
    setEmployeeGradeError("")

    try {
      const supabase = createClient()
      const { error } = await supabase.from("employee_grades").insert([newEmployee])

      if (error) throw error

      await loadEmployeeGrades()
      setNewEmployee({ nip: "", nama: "", golongan: "" })
      alert("Employee added successfully!")
    } catch (err: any) {
      setEmployeeGradeError(err.message || "Failed to add employee")
      console.error("Error adding employee:", err)
    } finally {
      setIsAddingEmployee(false)
    }
  }

  const deleteEmployeeGrade = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from("employee_grades").delete().eq("id", id)

      if (error) throw error

      await loadEmployeeGrades()
      alert("Employee deleted successfully!")
    } catch (err: any) {
      setEmployeeGradeError(err.message || "Failed to delete employee")
      console.error("Error deleting employee:", err)
    }
  }

  const handleEmployeeSearch = () => {
    setSearchEmployeeGrades(searchEmployeeGradesInput)
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Employee Grade Data Management</h2>
          <p className="text-muted-foreground">Manage employee grades and information</p>
        </div>

        <div className="space-y-6">
          {/* Import Employee Data Card */}
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

          {/* Add New Employee Card */}
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

          {/* Search Employee Grades Card */}
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Employee Grades List */}
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
                    {paginatedEmployeeGrades.map((employee) => (
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployeeGrades.length)} of{" "}
                    {filteredEmployeeGrades.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-border"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber
                        if (totalPages <= 5) {
                          pageNumber = i + 1
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i
                        } else {
                          pageNumber = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNumber)}
                            className={
                              currentPage === pageNumber
                                ? "bg-primary text-primary-foreground"
                                : "border-border hover:bg-muted"
                            }
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="border-border"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
