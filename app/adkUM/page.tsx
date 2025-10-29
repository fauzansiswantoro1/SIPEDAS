"use client";

import type React from "react";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Search,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

interface ExcelData {
  [key: string]: any[];
}

interface EmployeeGrade {
  id?: number;
  nip: string;
  nama: string;
  golongan: string;
}

interface CalculationResult {
  nama: string;
  nip: string;
  golongan: string;
  wfoDays: number;
  baseAmount: number;
  taxAmount: number;
  totalUangMakan: number;
}

interface AttendanceRecord {
  nama: string;
  nip: string;
  keterangan: string;
  totalDays: number;
  attendanceCounts: {
    A: number;
    T1: number;
    T2: number;
    T3: number;
    T4: number;
    P1: number;
    P2: number;
    P3: number;
    P4: number;
    CUTI: number;
    TL: number;
    HADIR: number;
  };
  cutPercentage: number;
  tunjanganBefore: number;
  tunjanganAfter: number;
  nominalCut: number;
}

interface TunjanganKinerja {
  id?: number;
  nip: string;
  nama: string;
  tunjangan_kinerja: number;
}

export default function ADKUangMakanPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  const [excelData, setExcelData] = useState<ExcelData>({});
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [employeeGrades, setEmployeeGrades] = useState<EmployeeGrade[]>([]);
  const [tunjanganKinerja, setTunjanganKinerja] = useState<TunjanganKinerja[]>(
    []
  );

  const [searchCalculation, setSearchCalculation] = useState("");
  const [searchCalculationInput, setSearchCalculationInput] = useState("");

  const [currentCalculationPage, setCurrentCalculationPage] = useState(1);
  const itemsPerCalculationPage = 10;

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    employeeType: "CPNS" | "PNS" | "PPPK";
    existingFileName: string;
    existingFileId: number;
    fileContent: string;
    generatedFileName: string;
    calculationData: Record<string, any>;
  } | null>(null);

  const currentSheetData = excelData[activeSheet] || [];
  const headers = currentSheetData[0] || [];
  const rows = currentSheetData.slice(1);

  const filteredRows = useMemo(() => {
    if (rows.length === 0) return [];

    const nipIndex = headers.indexOf("NIP");
    if (nipIndex === -1) return rows;

    return rows.filter((row: any[]) => {
      const nip = row[nipIndex]?.toString().replace(/'/g, "").trim() || "";
      // Exclude employees with these NIP prefixes
      return !(
        nip.startsWith("TATT") ||
        nip.startsWith("DIRDATAKB") ||
        nip.startsWith("PPNPN") ||
        nip.startsWith("DIRPGKP")
      );
    });
  }, [rows, headers]);

  const getEmployeeGrade = (nama: string): EmployeeGrade | undefined => {
    return employeeGrades.find(
      (emp) => emp.nama.toLowerCase() === nama.toLowerCase()
    );
  };

  const calculateRateAndTax = (
    golongan: string
  ): { rate: number; taxRate: number } => {
    let rate = 0;
    let taxRate = 0;

    if (golongan.startsWith("I/")) {
      rate = 35000;
      taxRate = 0;
    } else if (golongan.startsWith("II/")) {
      rate = 36000;
      taxRate = 0;
    } else if (golongan.startsWith("III/")) {
      rate = 37000;
      taxRate = 0.05;
    } else if (golongan.startsWith("IV/")) {
      rate = 38000;
      taxRate = 0.05;
    }

    return { rate, taxRate };
  };

  function calculateUangMakan(): CalculationResult[] {
    if (!excelData[activeSheet] || employeeGrades.length === 0) {
      console.log(
        "Cannot calculate: No active sheet data or employee grades data available."
      );
      return [];
    }

    const sheet = excelData[activeSheet];
    const headers = (sheet[0] || []).map(String);
    const dataRows = sheet.slice(1);
    const dateCols = headers.filter((h: string) => /^\d{1,2}$/.test(h));

    const results: CalculationResult[] = [];

    dataRows.forEach((row: any[], rowIndex: number) => {
      const nama = row[headers.indexOf("NAMA")]?.toString().trim() || "";
      const nip =
        row[headers.indexOf("NIP")]?.toString().replace(/'/g, "").trim() || "";

      console.log(
        `[v0] Processing row ${rowIndex + 1}: Nama='${nama}', NIP='${nip}'`
      );

      const employeeGrade = getEmployeeGrade(nama);

      if (!employeeGrade) {
        console.warn(
          `[v0] Skipping employee with Nama: '${nama}' (NIP: '${nip}') - Name not found in grade data.`
        );
        return;
      }

      let wfoDays = 0;
      dateCols.forEach((col: string) => {
        const colIndex = headers.indexOf(col);
        const value = row[colIndex]?.toString().toUpperCase().trim();
        if (value === "WFO") {
          wfoDays++;
        }
      });

      console.log(`[v0] WFO Days for '${nama}': ${wfoDays}`);

      const { rate, taxRate } = calculateRateAndTax(employeeGrade.golongan);
      const baseAmount = wfoDays * rate;
      const taxAmount = baseAmount * taxRate;
      const totalUangMakan = baseAmount - taxAmount;

      results.push({
        nama: employeeGrade.nama,
        nip,
        golongan: employeeGrade.golongan,
        wfoDays,
        baseAmount,
        taxAmount,
        totalUangMakan,
      });

      console.log(
        `[v0] Calculated for '${nama}': Golongan=${employeeGrade.golongan}, Base=${baseAmount}, Tax=${taxAmount}, Total=${totalUangMakan}`
      );
    });

    console.log("[v0] Calculated results count:", results.length);
    return results.sort((a, b) => a.nama.localeCompare(b.nama));
  }

  const calculationResults = useMemo(() => {
    return calculateUangMakan();
  }, [excelData, activeSheet, employeeGrades]);

  const filteredCalculationData = useMemo(() => {
    return calculationResults.filter((calc) => {
      if (!searchCalculation) return true;
      return (
        calc.nama.toLowerCase().includes(searchCalculation.toLowerCase()) ||
        calc.nip.toLowerCase().includes(searchCalculation.toLowerCase()) ||
        calc.golongan.toLowerCase().includes(searchCalculation.toLowerCase())
      );
    });
  }, [calculationResults, searchCalculation]);

  const totalCalculationPages = Math.ceil(
    filteredCalculationData.length / itemsPerCalculationPage
  );
  const paginatedCalculationData = useMemo(() => {
    const startIndex = (currentCalculationPage - 1) * itemsPerCalculationPage;
    const endIndex = startIndex + itemsPerCalculationPage;
    return filteredCalculationData.slice(startIndex, endIndex);
  }, [filteredCalculationData, currentCalculationPage]);

  useEffect(() => {
    setCurrentCalculationPage(1);
  }, [searchCalculation]);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
      } else {
        setIsAuthenticated(true);
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadEmployeeGrades();
      loadTunjanganKinerja();
    }
  }, [isAuthenticated]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render the page content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const loadEmployeeGrades = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_grades")
        .select("*")
        .order("nama", { ascending: true });

      if (error) throw error;
      setEmployeeGrades(data || []);
    } catch (err: any) {
      console.error("Error loading employee grades:", err);
    }
  };

  const loadTunjanganKinerja = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tunjangan_kinerja")
        .select("*")
        .order("nama", { ascending: true });

      if (error) throw error;
      setTunjanganKinerja(data || []);
    } catch (err: any) {
      console.error("Error loading tunjangan kinerja:", err);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const sheets: ExcelData = {};
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (sheetName === workbook.SheetNames[0]) {
          const actualHeaders = ((jsonData[0] as any[]) || []).map(String);

          if (actualHeaders[0] !== "NAMA" || actualHeaders[1] !== "NIP") {
            throw new Error(
              `Invalid Excel structure. First two columns must be 'NAMA' and 'NIP'. Found: ${actualHeaders[0]}, ${actualHeaders[1]}`
            );
          }
        }

        sheets[sheetName] = jsonData as any[];
      });

      setExcelData(sheets);
      setActiveSheet(workbook.SheetNames[0]);
      setFileName(file.name);
    } catch (err: any) {
      setError(err.message || "Failed to read Excel file");
      console.error("Error reading Excel file:", err);
    } finally {
      setIsLoading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDownloadTxt = async (employeeType: "CPNS" | "PNS" | "PPPK") => {
    if (!excelData[activeSheet] || excelData[activeSheet].length === 0) {
      alert("No data available to generate WFO file");
      return;
    }

    const sheet = excelData[activeSheet];
    const headers = (sheet[0] || []).map(String);
    const dataRows = sheet.slice(1);
    const dateCols = headers.filter((h: string) => /^\d{1,2}$/.test(h));

    const wfoEntries: string[] = [];
    dataRows.forEach((row: any[]) => {
      const nip = row[headers.indexOf("NIP")]
        ?.toString()
        .replace(/'/g, "")
        .trim();

      // Skip excluded prefixes
      if (
        nip &&
        (nip.startsWith("TATT") ||
          nip.startsWith("PPNPN") ||
          nip.startsWith("DIRDATA"))
      ) {
        console.log(
          `[v0] Skipping employee with NIP: ${nip} (excluded prefix)`
        );
        return;
      }

      if (nip) {
        if (employeeType === "CPNS" && !nip.includes("2025")) {
          return; // Skip if NIP doesn't contain 2025
        }

        if (
          employeeType === "PNS" &&
          (nip.includes("2025") || nip.includes("2024"))
        ) {
          return; // Skip if NIP contains 2025 or 2024
        }

        if (employeeType === "PPPK" && !nip.includes("2024")) {
          return; // Skip if NIP doesn't contain 2024
        }
      }

      dateCols.forEach((col: string) => {
        const colIndex = headers.indexOf(col);
        const value = row[colIndex]?.toString().toUpperCase().trim();
        if (value === "WFO") {
          const date = `${selectedYear}-${selectedMonth.padStart(
            2,
            "0"
          )}-${col.padStart(2, "0")}`;
          wfoEntries.push(`${nip}\t${date}`);
        }
      });
    });

    const fileContent = wfoEntries.join("\n");
    const generatedFileName = `WFO_${employeeType}_${selectedYear}${selectedMonth}_${fileName.replace(
      /\.[^/.]+$/,
      ""
    )}.txt`;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check for existing file with same type and period
        const { data: existingFiles, error: checkError } = await supabase
          .from("adk_archives")
          .select("id, file_name")
          .eq("employee_type", employeeType)
          .eq("period_month", selectedMonth)
          .eq("period_year", selectedYear)
          .limit(1);

        if (checkError) {
          console.error("[v0] Error checking for existing files:", checkError);
        }

        const shouldSave = true;
        const existingFileId: number | null = null;

        if (existingFiles && existingFiles.length > 0) {
          const relevantCalculations = calculationResults.filter((calc) => {
            const nip = calc.nip;
            if (employeeType === "CPNS") return nip.includes("2025");
            if (employeeType === "PPPK") return nip.includes("2024");
            if (employeeType === "PNS")
              return !nip.includes("2025") && !nip.includes("2024");
            return false;
          });

          const calculationData = relevantCalculations.reduce((acc, calc) => {
            acc[calc.nip] = {
              nama: calc.nama,
              golongan: calc.golongan,
              wfoDays: calc.wfoDays,
              baseAmount: calc.baseAmount,
              taxAmount: calc.taxAmount,
              totalUangMakan: calc.totalUangMakan,
            };
            return acc;
          }, {} as Record<string, any>);

          setConfirmDialogData({
            employeeType,
            existingFileName: existingFiles[0].file_name,
            existingFileId: existingFiles[0].id,
            fileContent,
            generatedFileName,
            calculationData,
          });
          setShowConfirmDialog(true);
          return; // Wait for user decision
        }

        if (shouldSave) {
          // Prepare calculation results for this employee type
          const relevantCalculations = calculationResults.filter((calc) => {
            const nip = calc.nip;
            if (employeeType === "CPNS") return nip.includes("2025");
            if (employeeType === "PPPK") return nip.includes("2024");
            if (employeeType === "PNS")
              return !nip.includes("2025") && !nip.includes("2024");
            return false;
          });

          const calculationData = relevantCalculations.reduce((acc, calc) => {
            acc[calc.nip] = {
              nama: calc.nama,
              golongan: calc.golongan,
              wfoDays: calc.wfoDays,
              baseAmount: calc.baseAmount,
              taxAmount: calc.taxAmount,
              totalUangMakan: calc.totalUangMakan,
            };
            return acc;
          }, {} as Record<string, any>);

          // Insert new record
          const { error: insertError } = await supabase
            .from("adk_archives")
            .insert({
              file_name: generatedFileName,
              file_content: fileContent,
              employee_type: employeeType,
              period_month: selectedMonth,
              period_year: selectedYear,
              calculation_results: calculationData,
              created_by: user.id,
            });

          if (insertError) {
            console.error("[v0] Error saving to archive:", insertError);
            alert(
              "File generated but failed to save to archive: " +
                insertError.message
            );
          } else {
            console.log("[v0] Successfully saved to archive");
            alert("File generated and saved to archive successfully!");
          }
        }
      }
    } catch (err: any) {
      console.error("[v0] Error saving archive:", err);
      alert("An error occurred while saving to archive: " + err.message);
    }

    // Download the file regardless of archive save status
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = generatedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmReplace = async () => {
    if (!confirmDialogData) return;

    try {
      const supabase = createClient();

      // Update existing record
      const { error: updateError } = await supabase
        .from("adk_archives")
        .update({
          file_name: confirmDialogData.generatedFileName,
          file_content: confirmDialogData.fileContent,
          calculation_results: confirmDialogData.calculationData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", confirmDialogData.existingFileId);

      if (updateError) {
        console.error("[v0] Error updating archive:", updateError);
        alert(
          "File generated but failed to update archive: " + updateError.message
        );
      } else {
        console.log("[v0] Successfully updated archive");
        alert("File generated and archive updated successfully!");
      }
    } catch (err: any) {
      console.error("[v0] Error updating archive:", err);
      alert("An error occurred while updating archive: " + err.message);
    }

    // Download the file
    const blob = new Blob([confirmDialogData.fileContent], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = confirmDialogData.generatedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Close dialog
    setShowConfirmDialog(false);
    setConfirmDialogData(null);
  };

  const handleCancelReplace = () => {
    if (!confirmDialogData) return;

    console.log("[v0] User cancelled saving to archive");
    alert("File will be downloaded but not saved to archive.");

    // Download the file anyway
    const blob = new Blob([confirmDialogData.fileContent], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = confirmDialogData.generatedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Close dialog
    setShowConfirmDialog(false);
    setConfirmDialogData(null);
  };

  const downloadCalculationResults = () => {
    console.log("[v0] Download Excel button clicked");
    console.log("[v0] Calculation results count:", calculationResults.length);

    const calculations = calculationResults;
    if (calculations.length === 0) {
      console.log("[v0] No calculation results available");
      alert("No calculation results to download");
      return;
    }

    try {
      console.log("[v0] Creating workbook...");
      const wb = XLSX.utils.book_new();

      const excelData = [
        [
          "NAMA",
          "NIP",
          "GOLONGAN",
          "HARI WFO",
          "TARIF PER HARI",
          "JUMLAH KOTOR",
          "PAJAK",
          "TOTAL UANG MAKAN",
        ],
        ...calculations.map((calc) => [
          calc.nama,
          calc.nip,
          calc.golongan,
          calc.wfoDays,
          calc.wfoDays > 0 ? calc.baseAmount / calc.wfoDays : 0,
          calc.baseAmount,
          calc.taxAmount,
          calc.totalUangMakan,
        ]),
      ];

      const totalEmployees = calculations.length;
      const grandTotalGross = calculations.reduce(
        (sum, calc) => sum + calc.baseAmount,
        0
      );
      const grandTotalTax = calculations.reduce(
        (sum, calc) => sum + calc.taxAmount,
        0
      );
      const grandTotalNet = calculations.reduce(
        (sum, calc) => sum + calc.totalUangMakan,
        0
      );

      excelData.push([]);
      excelData.push(["TOTAL PEGAWAI", totalEmployees, "", "", "", "", "", ""]);
      excelData.push(["TOTAL KOTOR", "", "", "", "", grandTotalGross, "", ""]);
      excelData.push(["TOTAL PAJAK", "", "", "", "", "", grandTotalTax, ""]);
      excelData.push(["TOTAL BERSIH", "", "", "", "", "", "", grandTotalNet]);

      console.log("[v0] Creating worksheet with", excelData.length, "rows");
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Calculation Results");

      const filename = `uang_makan_calculation_${selectedYear}${selectedMonth}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      console.log("[v0] Preparing file for download:", filename);

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("[v0] File download initiated successfully");
    } catch (error) {
      console.error("[v0] Error downloading Excel file:", error);
      alert(
        "Failed to download Excel file: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const handleCalculationSearch = () => {
    setSearchCalculation(searchCalculationInput);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage: "url('/images/adk-background.png')",
        }}
      />
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-white/90 via-amber-50/85 to-orange-50/90 -z-10" />

      {showConfirmDialog && confirmDialogData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    File Already Exists
                  </h3>
                  <p className="text-white/90 text-sm">
                    Duplicate ADK file detected
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-foreground">
                  An ADK .txt file already exists in the archive with the
                  following details:
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Employee Type:
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {confirmDialogData.employeeType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Period:
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {selectedMonth}/{selectedYear}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      Existing File:
                    </span>
                    <p className="text-sm font-mono text-foreground mt-1 break-all">
                      {confirmDialogData.existingFileName}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Do you want to replace the existing file with the new one, or
                cancel and keep the current file?
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleCancelReplace}
                  variant="outline"
                  className="flex-1 border-border hover:bg-muted bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmReplace}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                >
                  Replace File
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            ADK Uang Makan
          </h2>
          <p className="text-muted-foreground">
            Upload and process attendance data for uang makan calculation
          </p>
        </div>

        <div className="space-y-6">
          {/* Upload Excel File Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Upload Excel File</CardTitle>
                  <CardDescription>
                    Select an Excel file (.xlsx or .xls) to view its contents
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6 p-4 bg-muted/30 border border-border rounded-lg">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Select Period for ADK Generation
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    >
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    >
                      {Array.from(
                        { length: 10 },
                        (_, i) => new Date().getFullYear() - 5 + i
                      ).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        Selected:{" "}
                        {new Date(
                          Number.parseInt(selectedYear),
                          Number.parseInt(selectedMonth) - 1
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-7 h-7 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-2">
                  {isLoading
                    ? "Processing file..."
                    : "Choose an Excel file or drag it here"}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Supports .xlsx and .xls files
                </p>
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
                <Alert
                  className="mt-6 border-destructive/50 bg-destructive/10"
                  variant="destructive"
                >
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

          {/* Excel Data Display */}
          {Object.keys(excelData).length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="text-lg">Excel Data</CardTitle>
                <CardDescription>
                  {Object.keys(excelData).length > 1 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">
                        Sheets:
                      </span>
                      {Object.keys(excelData).map((sheetName) => (
                        <Button
                          key={sheetName}
                          variant={
                            activeSheet === sheetName ? "default" : "outline"
                          }
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
                            <TableHead
                              key={index}
                              className="font-semibold text-foreground"
                            >
                              {header || `Column ${index + 1}`}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row: any[], rowIndex: number) => (
                          <TableRow
                            key={rowIndex}
                            className="border-b border-border hover:bg-muted/50"
                          >
                            {headers.map((_: any, colIndex: number) => (
                              <TableCell key={colIndex} className="text-sm">
                                {row[colIndex] !== undefined
                                  ? String(row[colIndex])
                                  : ""}
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

                {filteredRows.length > 0 && (
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredRows.length} rows × {headers.length}{" "}
                      columns
                      {filteredRows.length < rows.length && (
                        <span className="ml-2 text-amber-600">
                          ({rows.length - filteredRows.length} rows filtered
                          out)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => handleDownloadTxt("CPNS")}
                        variant="outline"
                        className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 bg-transparent"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Generate ADK UM .txt for CPNS
                      </Button>
                      <Button
                        onClick={() => handleDownloadTxt("PNS")}
                        variant="outline"
                        className="flex-1 border-green-500 text-green-600 hover:bg-green-50 bg-transparent"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Generate ADK UM .txt for PNS
                      </Button>
                      <Button
                        onClick={() => handleDownloadTxt("PPPK")}
                        variant="outline"
                        className="flex-1 border-purple-500 text-purple-600 hover:bg-purple-50 bg-transparent"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Generate ADK UM .txt for PPPK
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Calculation Results */}
          {calculationResults.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Calculation Results
                      </CardTitle>
                      <CardDescription>
                        Golongan I dan II: Tidak dikenakan pajak. Golongan III:
                        Dikenakan PPh Pasal 21 sebesar 5%. Golongan IV:
                        Dikenakan PPh Pasal 21 sebesar 15%
                      </CardDescription>
                    </div>
                    <Button
                      onClick={downloadCalculationResults}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel
                    </Button>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by name, NIP, or golongan..."
                        className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        value={searchCalculationInput}
                        onChange={(e) =>
                          setSearchCalculationInput(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCalculationSearch();
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
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="font-semibold text-foreground">
                          Nama
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">
                          NIP
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">
                          Golongan
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">
                          WFO Days
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">
                          Base Amount
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">
                          Tax
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCalculationData.map((calc, index) => (
                        <TableRow
                          key={index}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <TableCell>{calc.nama}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {calc.nip}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                              {calc.golongan}
                            </span>
                          </TableCell>
                          <TableCell>{calc.wfoDays}</TableCell>
                          <TableCell>
                            Rp {calc.baseAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            Rp {calc.taxAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold">
                            Rp {calc.totalUangMakan.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalCalculationPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Showing{" "}
                      {(currentCalculationPage - 1) * itemsPerCalculationPage +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        currentCalculationPage * itemsPerCalculationPage,
                        filteredCalculationData.length
                      )}{" "}
                      of {filteredCalculationData.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentCalculationPage((prev) =>
                            Math.max(1, prev - 1)
                          )
                        }
                        disabled={currentCalculationPage === 1}
                        className="border-border hover:bg-muted"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {Array.from(
                          { length: Math.min(5, totalCalculationPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalCalculationPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentCalculationPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              currentCalculationPage >=
                              totalCalculationPages - 2
                            ) {
                              pageNum = totalCalculationPages - 4 + i;
                            } else {
                              pageNum = currentCalculationPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentCalculationPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  setCurrentCalculationPage(pageNum)
                                }
                                className={
                                  currentCalculationPage === pageNum
                                    ? "bg-primary text-primary-foreground"
                                    : "border-border hover:bg-muted"
                                }
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentCalculationPage((prev) =>
                            Math.min(totalCalculationPages, prev + 1)
                          )
                        }
                        disabled={
                          currentCalculationPage === totalCalculationPages
                        }
                        className="border-border hover:bg-muted"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
