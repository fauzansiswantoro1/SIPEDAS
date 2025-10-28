"use client";

import type React from "react";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  Download,
  Calculator,
  Database,
  Calendar,
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

interface TunjanganKinerja {
  id?: number;
  nip: string;
  nama: string;
  jabatan: string;
  unit_kerja: string;
  tunjangan_kinerja: number;
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

interface PostConfirmationData {
  no: number;
  nama: string;
  nip: string;
  jabatan: string;
  unit_kerja: string;
  keterangan: string;
  potongan_kehadiran: string;
  kelas_jabatan: number;
  tunkin: number;
  pot_bpk: string;
  potongan: string;
  potongan_lain: string;
  potongan_absen: string;
  total_potongan: string;
  tunkin_diterima: string;
}

interface ADKTukinFile {
  id: string;
  employee_type: string;
  period_month: string;
  period_year: string;
  file_name: string;
  file_data: any[];
  created_at: string;
  created_by: string;
}

export default function TunjanganKinerjaDataPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState(
    String(currentDate.getFullYear())
  );

  const [tunjanganKinerja, setTunjanganKinerja] = useState<TunjanganKinerja[]>(
    []
  );
  const [tunjanganKinerjaError, setTunjanganKinerjaError] =
    useState<string>("");
  const [newTunjanganKinerja, setNewTunjanganKinerja] = useState({
    nip: "",
    nama: "",
    jabatan: "",
    unit_kerja: "",
    tunjangan_kinerja: "",
  });
  const [isAddingTunjanganKinerja, setIsAddingTunjanganKinerja] =
    useState(false);
  const [isImportingTunjanganKinerja, setIsImportingTunjanganKinerja] =
    useState(false);
  const tunjanganKinerjaFileInputRef = useRef<HTMLInputElement>(null);

  const [mainTab, setMainTab] = useState<"calculation" | "management">(
    "calculation"
  );
  const [activeTab, setActiveTab] = useState<
    "import" | "add" | "list" | "adk-tukin"
  >("list");

  const attendanceFileInputRef = useRef<HTMLInputElement>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isUploadingAttendance, setIsUploadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [rawAttendanceData, setRawAttendanceData] = useState<any[][]>([]);

  const [searchTunjanganKinerja, setSearchTunjanganKinerja] = useState("");
  const [searchTunjanganKinerjaInput, setSearchTunjanganKinerjaInput] =
    useState("");

  const [searchAttendance, setSearchAttendance] = useState("");
  const [searchAttendanceInput, setSearchAttendanceInput] = useState("");
  const [searchEmployeeAttendance, setSearchEmployeeAttendance] = useState("");
  const [searchEmployeeAttendanceInput, setSearchEmployeeAttendanceInput] =
    useState("");
  const [selectedEmployeeAttendance, setSelectedEmployeeAttendance] = useState<
    any[]
  >([]);

  const [postConfirmationData, setPostConfirmationData] = useState<
    PostConfirmationData[]
  >([]);
  const [isUploadingPostConfirmation, setIsUploadingPostConfirmation] =
    useState(false);
  const [postConfirmationError, setPostConfirmationError] = useState<
    string | null
  >(null);
  const postConfirmationFileInputRef = useRef<HTMLInputElement>(null);

  const [adkTukinFiles, setAdkTukinFiles] = useState<ADKTukinFile[]>([]);
  const [selectedEmployeeType, setSelectedEmployeeType] =
    useState<string>("CPNS Mandiri");
  const [isUploadingAdkTukin, setIsUploadingAdkTukin] = useState(false);
  const [adkTukinError, setAdkTukinError] = useState<string | null>(null);
  const adkTukinFileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getPeriodDates = () => {
    const year = Number.parseInt(selectedYear, 10);
    const month = Number.parseInt(selectedMonth, 10);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Day 0 of next month is the last day of current month

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const displayText = `${monthNames[month - 1]} ${year}`;

    return { startDate, endDate, displayText };
  };

  const filteredTunjanganKinerja = useMemo(() => {
    return tunjanganKinerja.filter((tk) => {
      if (!searchTunjanganKinerja) return true;
      return (
        tk.nama.toLowerCase().includes(searchTunjanganKinerja.toLowerCase()) ||
        tk.nip.toLowerCase().includes(searchTunjanganKinerja.toLowerCase()) ||
        tk.jabatan
          .toLowerCase()
          .includes(searchTunjanganKinerja.toLowerCase()) ||
        tk.unit_kerja
          .toLowerCase()
          .includes(searchTunjanganKinerja.toLowerCase())
      );
    });
  }, [tunjanganKinerja, searchTunjanganKinerja]);

  const totalPages = Math.ceil(filteredTunjanganKinerja.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTunjanganKinerja = filteredTunjanganKinerja.slice(
    startIndex,
    endIndex
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTunjanganKinerja]);

  const filteredAttendanceData = useMemo(() => {
    const excludedPrefixes = ["PPNPN", "TATT", "DIRDATAKB", "DIRPGKP"];

    return attendanceData.filter((record) => {
      // Check if NIP starts with any excluded prefix
      const hasExcludedPrefix = excludedPrefixes.some((prefix) =>
        record.nip.toUpperCase().startsWith(prefix)
      );

      // Exclude if has excluded prefix
      if (hasExcludedPrefix) return false;

      // Apply search filter
      if (!searchAttendance) return true;
      return (
        record.nama.toLowerCase().includes(searchAttendance.toLowerCase()) ||
        record.nip.toLowerCase().includes(searchAttendance.toLowerCase()) ||
        record.keterangan.toLowerCase().includes(searchAttendance.toLowerCase())
      );
    });
  }, [attendanceData, searchAttendance]);

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
      loadTunjanganKinerja();
      loadAdkTukinFiles();
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
      setTunjanganKinerjaError(
        err.message || "Failed to load tunjangan kinerja"
      );
      console.error("Error loading tunjangan kinerja:", err);
    }
  };

  const handleTunjanganKinerjaFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingTunjanganKinerja(true);
    setTunjanganKinerjaError("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const supabase = createClient();
      for (const row of jsonData) {
        const { error } = await supabase.from("tunjangan_kinerja").upsert(
          {
            nip: String(row.NIP || row.nip),
            nama: String(row.NAMA || row.nama),
            jabatan: String(row.JABATAN || row.jabatan),
            unit_kerja: String(
              row.UNIT_KERJA || row.unit_kerja || row["UNIT KERJA"]
            ),
            tunjangan_kinerja: Number(
              row.TUNJANGAN_KINERJA ||
                row.tunjangan_kinerja ||
                row["TUNJANGAN KINERJA"]
            ),
          },
          { onConflict: "nip" }
        );

        if (error) throw error;
      }

      await loadTunjanganKinerja();
      alert("Tunjangan kinerja data imported successfully!");
    } catch (err: any) {
      setTunjanganKinerjaError(
        err.message || "Failed to import tunjangan kinerja data"
      );
      console.error("Error importing tunjangan kinerja data:", err);
    } finally {
      setIsImportingTunjanganKinerja(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const addTunjanganKinerja = async () => {
    if (
      !newTunjanganKinerja.nip ||
      !newTunjanganKinerja.nama ||
      !newTunjanganKinerja.jabatan ||
      !newTunjanganKinerja.unit_kerja ||
      !newTunjanganKinerja.tunjangan_kinerja
    ) {
      alert("Please fill in all fields");
      return;
    }

    setIsAddingTunjanganKinerja(true);
    setTunjanganKinerjaError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("tunjangan_kinerja").insert([
        {
          ...newTunjanganKinerja,
          tunjangan_kinerja: Number(newTunjanganKinerja.tunjangan_kinerja),
        },
      ]);

      if (error) throw error;

      await loadTunjanganKinerja();
      setNewTunjanganKinerja({
        nip: "",
        nama: "",
        jabatan: "",
        unit_kerja: "",
        tunjangan_kinerja: "",
      });
      alert("Tunjangan kinerja added successfully!");
    } catch (err: any) {
      setTunjanganKinerjaError(
        err.message || "Failed to add tunjangan kinerja"
      );
      console.error("Error adding tunjangan kinerja:", err);
    } finally {
      setIsAddingTunjanganKinerja(false);
    }
  };

  const deleteTunjanganKinerja = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tunjangan kinerja?"))
      return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("tunjangan_kinerja")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadTunjanganKinerja();
      alert("Tunjangan kinerja deleted successfully!");
    } catch (err: any) {
      setTunjanganKinerjaError(
        err.message || "Failed to delete tunjangan kinerja"
      );
      console.error("Error deleting tunjangan kinerja:", err);
    }
  };

  const handleTunjanganSearch = () => {
    setSearchTunjanganKinerja(searchTunjanganKinerjaInput);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAttendanceFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAttendance(true);
    setAttendanceError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setRawAttendanceData(XLSX.utils.sheet_to_json(worksheet, { header: 1 }));

      const employeeAttendanceMap = new Map<string, Map<string, any[]>>();

      // First pass: group by employee and date
      jsonData.forEach((row: any) => {
        const nama = row.NAMA?.toString().trim();
        let nip = row.NIP_BARU?.toString().trim();
        if (nip && nip.startsWith("'")) {
          nip = nip.substring(1);
        }
        const tanggal = row.TANGGAL_WITA?.toString().trim();

        if (!nama || !nip || !tanggal) return;

        const employeeKey = `${nip}-${nama}`;

        if (!employeeAttendanceMap.has(employeeKey)) {
          employeeAttendanceMap.set(employeeKey, new Map());
        }

        const employeeData = employeeAttendanceMap.get(employeeKey)!;
        if (!employeeData.has(tanggal)) {
          employeeData.set(tanggal, []);
        }

        employeeData.get(tanggal)!.push(row);
      });

      // Process attendance data with TL exemption
      const attendanceMap = new Map<string, AttendanceRecord>();

      employeeAttendanceMap.forEach((dateMap, employeeKey) => {
        const [nip, nama] = employeeKey.split("-");

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
          });
        }

        const record = attendanceMap.get(employeeKey)!;

        // Process each date
        dateMap.forEach((dayRecords, date) => {
          record.totalDays++;

          const hasTL = dayRecords.some(
            (row: any) => row.JENIS_CHECKIN?.toString().trim() === "TL"
          );

          if (hasTL) {
            // Only count TL for this day, ignore all other attendance codes
            record.attendanceCounts.TL++;
            return; // Skip processing other codes for this day
          }

          // Process attendance for this date (only if no TL)
          dayRecords.forEach((row: any) => {
            const kategoriTerlambat = row.KATEGORI_TERLAMBAT?.toString().trim();
            const kategoriPulangCepat =
              row.KATEGORI_PULANG_CEPAT?.toString().trim();
            const jenisCheckin = row.JENIS_CHECKIN?.toString().trim();

            // Count attendance types (only if no TL on this day)
            if (jenisCheckin === "A" || !jenisCheckin) {
              record.attendanceCounts.A++;
            } else if (jenisCheckin === "HADIR") {
              record.attendanceCounts.HADIR++;
            } else if (jenisCheckin === "CUTI") {
              record.attendanceCounts.CUTI++;
            }

            // Count late categories (only if no TL on this day)
            if (kategoriTerlambat === "T1") record.attendanceCounts.T1++;
            else if (kategoriTerlambat === "T2") record.attendanceCounts.T2++;
            else if (kategoriTerlambat === "T3") record.attendanceCounts.T3++;
            else if (kategoriTerlambat === "T4") record.attendanceCounts.T4++;

            // Count early leave categories (only if no TL on this day)
            if (kategoriPulangCepat === "P1") record.attendanceCounts.P1++;
            else if (kategoriPulangCepat === "P2") record.attendanceCounts.P2++;
            else if (kategoriPulangCepat === "P3") record.attendanceCounts.P3++;
            else if (kategoriPulangCepat === "P4") record.attendanceCounts.P4++;
          });
        });
      });

      // Calculate cuts and tunjangan
      const processedData = Array.from(attendanceMap.values()).map((record) => {
        // Calculate cut percentage
        let cutPercentage = 0;
        cutPercentage += record.attendanceCounts.A * 5; // A = 5%
        cutPercentage += record.attendanceCounts.T1 * 0.5; // T1 = 0.5%
        cutPercentage += record.attendanceCounts.T2 * 1; // T2 = 1%
        cutPercentage += record.attendanceCounts.T3 * 1.5; // T3 = 1.5%
        cutPercentage += record.attendanceCounts.T4 * 2.5; // T4 = 2.5%
        cutPercentage += record.attendanceCounts.P1 * 0.5; // P1 = 0.5%
        cutPercentage += record.attendanceCounts.P2 * 1; // P2 = 1%
        cutPercentage += record.attendanceCounts.P3 * 1.5; // P3 = 1.5%
        cutPercentage += record.attendanceCounts.P4 * 2.5; // P4 = 2.5%

        // Find tunjangan kinerja for this employee
        const tkData = tunjanganKinerja.find(
          (tk) => tk.nip === record.nip || tk.nama === record.nama
        );
        const tunjanganBefore = tkData ? tkData.tunjangan_kinerja : 0;

        // Calculate after cut
        const tunjanganAfter = tunjanganBefore * (1 - cutPercentage / 100);
        const nominalCut = tunjanganBefore - tunjanganAfter;

        // Create keterangan string
        const keterangan = `A:${record.attendanceCounts.A}, T1:${record.attendanceCounts.T1}, T2:${record.attendanceCounts.T2}, T3:${record.attendanceCounts.T3}, T4:${record.attendanceCounts.T4}, P1:${record.attendanceCounts.P1}, P2:${record.attendanceCounts.P2}, P3:${record.attendanceCounts.P3}, P4:${record.attendanceCounts.P4}, CUTI:${record.attendanceCounts.CUTI}, TL:${record.attendanceCounts.TL}, HADIR:${record.attendanceCounts.HADIR}`;

        return {
          ...record,
          keterangan,
          cutPercentage,
          tunjanganBefore,
          tunjanganAfter,
          nominalCut,
        };
      });

      setAttendanceData(processedData);
      console.log(
        "[v0] Attendance data processed:",
        processedData.length,
        "employees"
      );
    } catch (error) {
      console.error("Error processing attendance file:", error);
      setAttendanceError(
        "Error processing attendance file. Please check the file format."
      );
    } finally {
      setIsUploadingAttendance(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleAttendanceSearch = () => {
    setSearchAttendance(searchAttendanceInput);
  };

  const handleEmployeeAttendanceSearch = () => {
    setSearchEmployeeAttendance(searchEmployeeAttendanceInput);
    searchEmployeeAttendanceDetails(searchEmployeeAttendanceInput);
  };

  const searchEmployeeAttendanceDetails = (searchTerm: string) => {
    if (!rawAttendanceData || rawAttendanceData.length < 2 || !searchTerm) {
      setSelectedEmployeeAttendance([]);
      return;
    }

    const headers = rawAttendanceData[0];
    const rows = rawAttendanceData.slice(1);

    const namaIndex = headers.findIndex(
      (h: string) => String(h).toUpperCase() === "NAMA"
    );
    const nipIndex = headers.findIndex(
      (h: string) => String(h).toUpperCase() === "NIP"
    );

    const matchedRows = rows.filter((row: any[]) => {
      const nama = String(row[namaIndex] || "").toLowerCase();
      const nip = String(row[nipIndex] || "").toLowerCase();
      const search = searchTerm.toLowerCase();

      return nama.includes(search) || nip.includes(search);
    });

    if (matchedRows.length > 0) {
      setSelectedEmployeeAttendance([headers, ...matchedRows]);
    } else {
      setSelectedEmployeeAttendance([]);
    }
  };

  // Handler for post-confirmation file upload
  const handlePostConfirmationFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPostConfirmation(true);
    setPostConfirmationError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const processedData: PostConfirmationData[] = jsonData.map(
        (row: any, index: number) => ({
          no: row.No || index + 1,
          nama: String(row.Nama || ""),
          nip: String(row.NIP || ""),
          jabatan: String(row.Jabatan || ""),
          unit_kerja: String(row["Unit kerja"] || row.unit_kerja || ""),
          keterangan: String(row.Keterangan || ""),
          potongan_kehadiran: String(
            row["Potongan Kehadiran"] || row.potongan_kehadiran || ""
          ),
          kelas_jabatan: Number(row["Kelas Jabatan"] || row.kelas_jabatan || 0),
          tunkin: Number(row.Tunkin || 0),
          pot_bpk: String(row["Pot. BPK"] || row.pot_bpk || "Rp0.00"),
          potongan: String(row.Potongan || ""),
          potongan_lain: String(
            row["Potongan Lain"] || row.potongan_lain || ""
          ),
          potongan_absen: String(
            row["Potongan Absen"] || row.potongan_absen || ""
          ),
          total_potongan: String(
            row["Total Potongan"] || row.total_potongan || ""
          ),
          tunkin_diterima: String(
            row["Tunkin Diterima"] || row.tunkin_diterima || ""
          ),
        })
      );

      setPostConfirmationData(processedData);
      console.log(
        "[v0] Post-confirmation data processed:",
        processedData.length,
        "records"
      );
    } catch (error) {
      console.error("Error processing post-confirmation file:", error);
      setPostConfirmationError(
        "Error processing file. Please check the file format."
      );
    } finally {
      setIsUploadingPostConfirmation(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const downloadAttendanceResults = async () => {
    if (attendanceData.length === 0) {
      alert("No attendance data to download");
      return;
    }

    try {
      const excludedPrefixes = ["PPNPN", "TATT", "DIRDATAKB", "DIRPGKP"];
      const filteredData = attendanceData.filter((record) => {
        const hasExcludedPrefix = excludedPrefixes.some((prefix) =>
          record.nip.toUpperCase().startsWith(prefix)
        );
        return !hasExcludedPrefix;
      });

      const headers = [
        "NAMA",
        "NIP",
        "KETERANGAN",
        "TOTAL DAYS",
        "A",
        "T1",
        "T2",
        "T3",
        "T4",
        "P1",
        "P2",
        "P3",
        "P4",
        "CUTI",
        "TL",
        "HADIR",
        "TUNJANGAN BEFORE",
        "CUT %",
        "NOMINAL CUT",
        "TUNJANGAN AFTER",
      ];
      const rows = filteredData.map((r) => [
        r.nama,
        r.nip,
        r.keterangan,
        r.totalDays,
        r.attendanceCounts.A,
        r.attendanceCounts.T1,
        r.attendanceCounts.T2,
        r.attendanceCounts.T3,
        r.attendanceCounts.T4,
        r.attendanceCounts.P1,
        r.attendanceCounts.P2,
        r.attendanceCounts.P3,
        r.attendanceCounts.P4,
        r.attendanceCounts.CUTI,
        r.attendanceCounts.TL,
        r.attendanceCounts.HADIR,
        r.tunjanganBefore,
        r.cutPercentage,
        r.nominalCut,
        r.tunjanganAfter,
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Results");

      // Generate file data as array buffer
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      // Create blob and download
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const periodDates = getPeriodDates();
      link.download = `tunjangan_kinerja_calculation_${selectedYear}${selectedMonth}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert(
          "Excel file downloaded, but you must be logged in to save to archive"
        );
        return;
      }

      // Check if archive already exists for this period
      const { data: existingArchive, error: checkError } = await supabase
        .from("tunjangan_kinerja_archives")
        .select("id")
        .eq("period_month", selectedMonth)
        .eq("period_year", selectedYear)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected
        throw checkError;
      }

      if (existingArchive) {
        // Archive exists, ask user if they want to replace
        const shouldReplace = confirm(
          `An archive already exists for ${periodDates.displayText}. Do you want to replace it?`
        );

        if (!shouldReplace) {
          return; // User cancelled, file is already downloaded
        }

        // Delete existing archive
        const { error: deleteError } = await supabase
          .from("tunjangan_kinerja_archives")
          .delete()
          .eq("id", existingArchive.id);

        if (deleteError) throw deleteError;
      }

      // Save new archive with filtered data
      const { error: insertError } = await supabase
        .from("tunjangan_kinerja_archives")
        .insert({
          period_month: selectedMonth,
          period_year: selectedYear,
          period_start_date: periodDates.startDate.toISOString().split("T")[0],
          period_end_date: periodDates.endDate.toISOString().split("T")[0],
          calculation_results: filteredData, // Save filtered data to archive
          created_by: user.id,
        });

      if (insertError) throw insertError;

      alert("Excel file downloaded and saved to archive successfully!");
    } catch (error) {
      console.error("Error downloading or saving:", error);
      alert(
        "Excel file downloaded, but there was an error saving to archive: " +
          (error as Error).message
      );
    }
  };

  const generateADKTukin = async (employeeType: string) => {
    if (postConfirmationData.length === 0) {
      alert("No post-confirmation data to generate ADK file");
      return;
    }

    const adkFile = adkTukinFiles.find(
      (file) =>
        file.employee_type === employeeType &&
        file.period_month === selectedMonth &&
        file.period_year === selectedYear
    );

    if (!adkFile || !adkFile.file_data || adkFile.file_data.length === 0) {
      alert(
        `No ADK Tukin ${employeeType} file found for the selected period. Please upload the file first.`
      );
      return;
    }

    try {
      // Helper function to parse currency string to number
      const parseCurrency = (value: string | number): number => {
        if (typeof value === "number") return value;
        // Remove "Rp", ".", and any whitespace, then parse
        const cleaned = value.replace(/Rp|\.|\s/g, "").replace(",", ".");
        return Number.parseFloat(cleaned) || 0;
      };

      // Create a map of post-confirmation data by NIP for quick lookup
      const postConfirmationMap = new Map<string, PostConfirmationData>();
      postConfirmationData.forEach((record) => {
        postConfirmationMap.set(record.nip, record);
      });

      // Use the uploaded ADK file as template
      const templateData = adkFile.file_data;
      const headers = templateData[0]; // First row is headers
      const dataRows = templateData.slice(1); // Rest are data rows

      // Process each row from the template
      const updatedRows = dataRows.map((row: any[]) => {
        // Create a copy of the row
        const updatedRow = [...row];

        // Get NIP from column D (index 3)
        const nip = String(updatedRow[3] || "").trim();

        // Find matching record in post-confirmation data
        const matchingRecord = postConfirmationMap.get(nip);

        if (matchingRecord) {
          // Update column B (index 1): Month
          updatedRow[1] = selectedMonth;

          // Update column H (index 7): Tunkin value as text
          const tunkinValue = Math.round(parseCurrency(matchingRecord.tunkin));
          updatedRow[7] = String(tunkinValue);

          // Update column I (index 8): Total Potongan value as text
          const totalPotonganValue = Math.round(
            parseCurrency(matchingRecord.total_potongan)
          );
          updatedRow[8] = String(totalPotonganValue);

          // Update column J (index 9): Tunkin Diterima (H - I) as text
          updatedRow[9] = String(tunkinValue - totalPotonganValue);

          // Update column O (index 14): Bulan Bayar
          updatedRow[14] = selectedMonth;

          // Update column Q (index 16): Bulan Gaji
          updatedRow[16] = selectedMonth;
        }

        return updatedRow;
      });

      // Create worksheet from array of arrays (headers + updated rows)
      const ws = XLSX.utils.aoa_to_sheet([headers, ...updatedRows]);

      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `ADK Tukin ${employeeType}`);

      // Generate Excel file as array buffer
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      // Create blob and download
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `ADK-TUKIN-${employeeType
        .replace(/\s+/g, "-")
        .toUpperCase()}-${selectedYear}${selectedMonth}.xlsx`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check for duplicate
        const { data: existingArchive } = await supabase
          .from("adk_tukin_archives")
          .select("id")
          .eq("employee_type", employeeType)
          .eq("period_month", selectedMonth)
          .eq("period_year", selectedYear)
          .single();

        if (existingArchive) {
          const shouldReplace = confirm(
            `An ADK Tukin ${employeeType} archive for ${selectedMonth}/${selectedYear} already exists. Do you want to replace it?`
          );

          if (shouldReplace) {
            await supabase
              .from("adk_tukin_archives")
              .delete()
              .eq("id", existingArchive.id);
          } else {
            alert(
              "ADK Tukin file generated successfully (not saved to archive)!"
            );
            return;
          }
        }

        const { error: insertError } = await supabase
          .from("adk_tukin_archives")
          .insert({
            employee_type: employeeType,
            period_month: selectedMonth,
            period_year: selectedYear,
            file_data: [headers, ...updatedRows],
            file_name: fileName,
            created_by: user.id,
          });

        if (insertError) {
          console.error("Error saving to archive:", insertError);
          alert(
            "ADK Tukin file generated successfully, but failed to save to archive: " +
              insertError.message
          );
        } else {
          alert(
            `ADK Tukin ${employeeType} Excel file generated and saved to archive successfully!`
          );
        }
      } else {
        alert(`ADK Tukin ${employeeType} Excel file generated successfully!`);
      }
    } catch (error) {
      console.error("Error generating ADK file:", error);
      alert("Error generating ADK file: " + (error as Error).message);
    }
  };

  const generateADKTukinCPNSMandiri = () => {
    generateADKTukin("CPNS Mandiri");
  };

  const generateADKTukinCPNSBNI = () => {
    generateADKTukin("CPNS BNI");
  };

  const generateADKTukinCPNSBSI = () => {
    generateADKTukin("CPNS BSI");
  };

  const generateADKTukinPNS = () => {
    generateADKTukin("PNS");
  };

  const generateADKTukinPPPK = () => {
    generateADKTukin("PPPK");
  };

  const loadAdkTukinFiles = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("adk_tukin_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdkTukinFiles(data || []);
    } catch (err: any) {
      console.error("Error loading ADK Tukin files:", err);
    }
  };

  // Handle ADK Tukin file upload
  const handleAdkTukinFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAdkTukin(true);
    setAdkTukinError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });

      // Validate that the file has data
      if (rawData.length === 0) {
        throw new Error("The uploaded file is empty");
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to upload files");
      }

      // Check if file already exists for this period and employee type
      const { data: existingFile, error: checkError } = await supabase
        .from("adk_tukin_files")
        .select("id")
        .eq("employee_type", selectedEmployeeType)
        .eq("period_month", selectedMonth)
        .eq("period_year", selectedYear)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingFile) {
        const shouldReplace = confirm(
          `An ADK Tukin file for ${selectedEmployeeType} already exists for this period. Do you want to replace it?`
        );

        if (!shouldReplace) {
          setIsUploadingAdkTukin(false);
          if (event.target) event.target.value = "";
          return;
        }

        // Delete existing file
        const { error: deleteError } = await supabase
          .from("adk_tukin_files")
          .delete()
          .eq("id", existingFile.id);

        if (deleteError) throw deleteError;
      }

      const { error: insertError } = await supabase
        .from("adk_tukin_files")
        .insert({
          employee_type: selectedEmployeeType,
          period_month: selectedMonth,
          period_year: selectedYear,
          file_name: file.name,
          file_data: rawData, // Store as array of arrays to preserve exact format
          created_by: user.id,
        });

      if (insertError) throw insertError;

      await loadAdkTukinFiles();
      alert("ADK Tukin file uploaded successfully!");
    } catch (error) {
      console.error("Error uploading ADK Tukin file:", error);
      setAdkTukinError("Error uploading file: " + (error as Error).message);
    } finally {
      setIsUploadingAdkTukin(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  // Delete ADK Tukin file
  const deleteAdkTukinFile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ADK Tukin file?"))
      return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("adk_tukin_files")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadAdkTukinFiles();
      alert("ADK Tukin file deleted successfully!");
    } catch (err: any) {
      alert("Failed to delete ADK Tukin file: " + err.message);
      console.error("Error deleting ADK Tukin file:", err);
    }
  };

  // Download ADK Tukin file
  const downloadAdkTukinFile = (file: ADKTukinFile) => {
    try {
      const ws = XLSX.utils.aoa_to_sheet(file.file_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ADK Tukin");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error downloading file: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img
          src="/images/tukin-background.png"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-amber-50/85 to-orange-50/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Tunjangan Kinerja Management
          </h2>
          <p className="text-muted-foreground">
            Manage tunjangan kinerja data and attendance records
          </p>
        </div>

        <div className="mb-6 bg-white/90 backdrop-blur-md border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-border bg-muted/30">
            <button
              onClick={() => setMainTab("calculation")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                mainTab === "calculation"
                  ? "text-primary border-b-2 border-primary bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Tunjangan Kinerja Calculation</span>
            </button>
            <button
              onClick={() => setMainTab("management")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                mainTab === "management"
                  ? "text-primary border-b-2 border-primary bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Data Management</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {mainTab === "calculation" && (
            <div className="space-y-6">
              <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-border bg-background/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Calculation Period
                      </CardTitle>
                      <CardDescription>
                        Select the period for tunjangan kinerja calculation
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
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
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Year
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = currentDate.getFullYear() - 2 + i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Selected Period:
                          </p>
                          <p className="text-lg font-semibold text-primary">
                            {getPeriodDates().displayText}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Attendance Data - stays at top */}
              <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-border bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Upload Attendance Data
                      </CardTitle>
                      <CardDescription>
                        Upload attendance Excel file for detailed analysis
                      </CardDescription>
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
                      {isUploadingAttendance
                        ? "Processing file..."
                        : "Choose an attendance file or drag it here"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Supports .xlsx and .xls files
                    </p>
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
                    <Alert
                      className="mt-6 border-destructive/50 bg-destructive/10"
                      variant="destructive"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{attendanceError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Attendance Analysis - stays after upload */}
              {attendanceData.length > 0 && (
                <>
                  <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="border-b border-border bg-muted/30">
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              Tunjangan Kinerja Calculation Result
                            </CardTitle>
                            <CardDescription>
                              Detailed attendance records (
                              {filteredAttendanceData.length} records)
                            </CardDescription>
                          </div>
                          <Button
                            onClick={downloadAttendanceResults}
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
                              placeholder="Search by name, NIP, or keterangan..."
                              className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                              value={searchAttendanceInput}
                              onChange={(e) =>
                                setSearchAttendanceInput(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleAttendanceSearch();
                                }
                              }}
                            />
                          </div>
                          <Button
                            onClick={handleAttendanceSearch}
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
                                Keterangan
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Total Days
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                A
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                T1
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                T2
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                T3
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                T4
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                P1
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                P2
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                P3
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                P4
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                CUTI
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                TL
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                HADIR
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Tunjangan (Before)
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Cut %
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Nominal Cut
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Tunjangan (After)
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAttendanceData.map((record, index) => (
                              <TableRow
                                key={index}
                                className="border-b border-border hover:bg-muted/50"
                              >
                                <TableCell>{record.nama}</TableCell>
                                <TableCell className="font-mono text-sm">
                                  {record.nip}
                                </TableCell>
                                <TableCell>{record.keterangan}</TableCell>
                                <TableCell>{record.totalDays}</TableCell>
                                <TableCell>
                                  {record.attendanceCounts.A}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.T1}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.T2}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.T3}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.T4}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.P1}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.P2}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.P3}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.P4}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.CUTI}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.TL}
                                </TableCell>
                                <TableCell>
                                  {record.attendanceCounts.HADIR}
                                </TableCell>
                                <TableCell className="font-medium">
                                  Rp{" "}
                                  {record.tunjanganBefore.toLocaleString(
                                    "id-ID"
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                                      record.cutPercentage === 0
                                        ? "bg-green-100 text-green-800"
                                        : record.cutPercentage <= 10
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {record.cutPercentage}%
                                  </span>
                                </TableCell>
                                <TableCell className="font-medium text-red-600">
                                  Rp {record.nominalCut.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="font-medium">
                                  Rp{" "}
                                  {record.tunjanganAfter.toLocaleString(
                                    "id-ID"
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader className="border-b border-border bg-muted/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Search className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Search Employee Attendance Detail
                          </CardTitle>
                          <CardDescription>
                            View detailed daily attendance for a specific
                            employee
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search by employee name or NIP..."
                            className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            value={searchEmployeeAttendanceInput}
                            onChange={(e) =>
                              setSearchEmployeeAttendanceInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleEmployeeAttendanceSearch();
                              }
                            }}
                          />
                        </div>
                        <Button
                          onClick={handleEmployeeAttendanceSearch}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                        >
                          Search
                        </Button>
                      </div>

                      {selectedEmployeeAttendance.length > 0 && (
                        <div className="mt-6 overflow-auto border border-input rounded-xl">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-b border-border">
                                {selectedEmployeeAttendance[0].map(
                                  (header: any, index: number) => (
                                    <TableHead
                                      key={index}
                                      className="font-semibold text-foreground"
                                    >
                                      {header || `Column ${index + 1}`}
                                    </TableHead>
                                  )
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedEmployeeAttendance
                                .slice(1)
                                .map((row: any[], rowIndex: number) => (
                                  <TableRow
                                    key={rowIndex}
                                    className="border-b border-border hover:bg-muted/50"
                                  >
                                    {row.map((cell: any, cellIndex: number) => (
                                      <TableCell
                                        key={cellIndex}
                                        className="text-sm"
                                      >
                                        {cell !== undefined ? String(cell) : ""}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {searchEmployeeAttendance &&
                        selectedEmployeeAttendance.length === 0 && (
                          <div className="mt-6 text-center py-8 text-muted-foreground">
                            <p>
                              No employee found matching "
                              {searchEmployeeAttendance}"
                            </p>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </>
              )}

              <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-border bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Pengolahan Data Setelah Konfirmasi
                      </CardTitle>
                      <CardDescription>
                        Upload final calculation Excel file after confirmation
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                    onDragOver={handleDragOver}
                    onClick={() =>
                      postConfirmationFileInputRef.current?.click()
                    }
                  >
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <FileSpreadsheet className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">
                      {isUploadingPostConfirmation
                        ? "Processing file..."
                        : "Choose a file or drag it here"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Supports .xlsx and .xls files
                    </p>
                    <Button
                      disabled={isUploadingPostConfirmation}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6"
                    >
                      {isUploadingPostConfirmation
                        ? "Processing..."
                        : "Select File"}
                    </Button>
                    <input
                      ref={postConfirmationFileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handlePostConfirmationFileUpload}
                      className="hidden"
                    />
                  </div>

                  {postConfirmationError && (
                    <Alert
                      className="mt-6 border-destructive/50 bg-destructive/10"
                      variant="destructive"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {postConfirmationError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {postConfirmationData.length > 0 && (
                    <div className="mt-6">
                      <div className="mb-4 flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Uploaded Data
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {postConfirmationData.length} records
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <Button
                            onClick={generateADKTukinCPNSMandiri}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Generate ADK Tukin CPNS Mandiri
                          </Button>
                          <Button
                            onClick={generateADKTukinCPNSBNI}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Generate ADK Tukin CPNS BNI
                          </Button>
                          <Button
                            onClick={generateADKTukinCPNSBSI}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Generate ADK Tukin CPNS BSI
                          </Button>
                          <Button
                            onClick={generateADKTukinPNS}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Generate ADK Tukin PNS
                          </Button>
                          <Button
                            onClick={generateADKTukinPPPK}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Generate ADK Tukin PPPK
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-auto border border-input rounded-xl">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-border">
                              <TableHead className="font-semibold text-foreground">
                                No
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Nama
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                NIP
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Jabatan
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Unit Kerja
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Keterangan
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Potongan Kehadiran
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Kelas Jabatan
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Tunkin
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Pot. BPK
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Potongan
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Potongan Lain
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Potongan Absen
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Total Potongan
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">
                                Tunkin Diterima
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {postConfirmationData.map((record, index) => (
                              <TableRow
                                key={index}
                                className="border-b border-border hover:bg-muted/50"
                              >
                                <TableCell>{record.no}</TableCell>
                                <TableCell>{record.nama}</TableCell>
                                <TableCell className="font-mono text-sm">
                                  {record.nip}
                                </TableCell>
                                <TableCell>{record.jabatan}</TableCell>
                                <TableCell>{record.unit_kerja}</TableCell>
                                <TableCell className="text-sm">
                                  {record.keterangan}
                                </TableCell>
                                <TableCell>
                                  {record.potongan_kehadiran}
                                </TableCell>
                                <TableCell>{record.kelas_jabatan}</TableCell>
                                <TableCell>
                                  Rp {record.tunkin.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell>{record.pot_bpk}</TableCell>
                                <TableCell>{record.potongan}</TableCell>
                                <TableCell>{record.potongan_lain}</TableCell>
                                <TableCell>{record.potongan_absen}</TableCell>
                                <TableCell className="font-medium">
                                  {record.total_potongan}
                                </TableCell>
                                <TableCell className="font-medium text-green-600">
                                  {record.tunkin_diterima}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {mainTab === "management" && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
                {/* Tab Navigation */}
                <div className="flex border-b border-border bg-muted/30">
                  <button
                    onClick={() => setActiveTab("list")}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                      activeTab === "list"
                        ? "text-primary border-b-2 border-primary bg-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Data List
                  </button>
                  <button
                    onClick={() => setActiveTab("import")}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                      activeTab === "import"
                        ? "text-primary border-b-2 border-primary bg-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Import Data
                  </button>
                  <button
                    onClick={() => setActiveTab("add")}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                      activeTab === "add"
                        ? "text-primary border-b-2 border-primary bg-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Add New
                  </button>
                  <button
                    onClick={() => setActiveTab("adk-tukin")}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                      activeTab === "adk-tukin"
                        ? "text-primary border-b-2 border-primary bg-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Upload ADK Tukin
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Data List Tab */}
                  {activeTab === "list" && (
                    <div className="space-y-6">
                      {/* Search Tunjangan Kinerja Card */}
                      <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                        <CardHeader className="border-b border-border bg-muted/30">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Search className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                Search Tunjangan Kinerja
                              </CardTitle>
                              <CardDescription>
                                Search by name, NIP, jabatan, or unit kerja
                              </CardDescription>
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
                                onChange={(e) =>
                                  setSearchTunjanganKinerjaInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleTunjanganSearch();
                                  }
                                }}
                              />
                            </div>
                            <Button
                              onClick={handleTunjanganSearch}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                            >
                              Search
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tunjangan Kinerja List */}
                      <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                        <CardHeader className="border-b border-border bg-muted/30">
                          <CardTitle className="text-lg">
                            Tunjangan Kinerja Data
                          </CardTitle>
                          <CardDescription>
                            List of tunjangan kinerja data (
                            {filteredTunjanganKinerja.length} records)
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border">
                                  <TableHead className="font-semibold text-foreground">
                                    NIP
                                  </TableHead>
                                  <TableHead className="font-semibold text-foreground">
                                    Nama
                                  </TableHead>
                                  <TableHead className="font-semibold text-foreground">
                                    Jabatan
                                  </TableHead>
                                  <TableHead className="font-semibold text-foreground">
                                    Unit Kerja
                                  </TableHead>
                                  <TableHead className="font-semibold text-foreground">
                                    Tunjangan Kinerja
                                  </TableHead>
                                  <TableHead className="text-right font-semibold text-foreground">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedTunjanganKinerja.map((tk) => (
                                  <TableRow
                                    key={tk.id}
                                    className="border-b border-border hover:bg-muted/50"
                                  >
                                    <TableCell className="font-mono text-sm">
                                      {tk.nip}
                                    </TableCell>
                                    <TableCell>{tk.nama}</TableCell>
                                    <TableCell>{tk.jabatan}</TableCell>
                                    <TableCell>{tk.unit_kerja}</TableCell>
                                    <TableCell>
                                      Rp {tk.tunjangan_kinerja.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          deleteTunjanganKinerja(
                                            tk.id as number
                                          )
                                        }
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
                                Showing {startIndex + 1} to{" "}
                                {Math.min(
                                  endIndex,
                                  filteredTunjanganKinerja.length
                                )}{" "}
                                of {filteredTunjanganKinerja.length} entries
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setCurrentPage((prev) =>
                                      Math.max(1, prev - 1)
                                    )
                                  }
                                  disabled={currentPage === 1}
                                  className="border-border"
                                >
                                  Previous
                                </Button>
                                <div className="flex items-center space-x-1">
                                  {Array.from(
                                    { length: Math.min(5, totalPages) },
                                    (_, i) => {
                                      let pageNum;
                                      if (totalPages <= 5) {
                                        pageNum = i + 1;
                                      } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                      } else if (
                                        currentPage >=
                                        totalPages - 2
                                      ) {
                                        pageNum = totalPages - 4 + i;
                                      } else {
                                        pageNum = currentPage - 2 + i;
                                      }
                                      return (
                                        <Button
                                          key={pageNum}
                                          variant={
                                            currentPage === pageNum
                                              ? "default"
                                              : "outline"
                                          }
                                          size="sm"
                                          onClick={() =>
                                            setCurrentPage(pageNum)
                                          }
                                          className={
                                            currentPage === pageNum
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
                                    setCurrentPage((prev) =>
                                      Math.min(totalPages, prev + 1)
                                    )
                                  }
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
                  )}

                  {/* Import Data Tab */}
                  {activeTab === "import" && (
                    <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader className="border-b border-border bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Upload className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              Import Tunjangan Kinerja Data
                            </CardTitle>
                            <CardDescription>
                              Import tunjangan kinerja data from an Excel file
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div
                          className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                          onDragOver={handleDragOver}
                          onClick={() =>
                            tunjanganKinerjaFileInputRef.current?.click()
                          }
                        >
                          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <FileSpreadsheet className="w-7 h-7 text-primary" />
                          </div>
                          <p className="text-lg font-semibold text-foreground mb-2">
                            {isImportingTunjanganKinerja
                              ? "Importing data..."
                              : "Choose an Excel file or drag it here"}
                          </p>
                          <p className="text-sm text-muted-foreground mb-6">
                            Supports .xlsx and .xls files
                          </p>
                          <Button
                            disabled={isImportingTunjanganKinerja}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6"
                          >
                            {isImportingTunjanganKinerja
                              ? "Importing..."
                              : "Select File"}
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
                          <Alert
                            className="mt-6 border-destructive/50 bg-destructive/10"
                            variant="destructive"
                          >
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {tunjanganKinerjaError}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Add New Tab */}
                  {activeTab === "add" && (
                    <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader className="border-b border-border bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Plus className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              Add New Tunjangan Kinerja
                            </CardTitle>
                            <CardDescription>
                              Manually add new tunjangan kinerja data
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid gap-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <label
                                htmlFor="nip"
                                className="text-sm font-medium text-foreground"
                              >
                                NIP
                              </label>
                              <input
                                type="text"
                                id="nip"
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                placeholder="Enter NIP"
                                value={newTunjanganKinerja.nip}
                                onChange={(e) =>
                                  setNewTunjanganKinerja({
                                    ...newTunjanganKinerja,
                                    nip: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <label
                                htmlFor="nama"
                                className="text-sm font-medium text-foreground"
                              >
                                Nama
                              </label>
                              <input
                                type="text"
                                id="nama"
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                placeholder="Enter name"
                                value={newTunjanganKinerja.nama}
                                onChange={(e) =>
                                  setNewTunjanganKinerja({
                                    ...newTunjanganKinerja,
                                    nama: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <label
                                htmlFor="jabatan"
                                className="text-sm font-medium text-foreground"
                              >
                                Jabatan
                              </label>
                              <input
                                type="text"
                                id="jabatan"
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                placeholder="Enter jabatan"
                                value={newTunjanganKinerja.jabatan}
                                onChange={(e) =>
                                  setNewTunjanganKinerja({
                                    ...newTunjanganKinerja,
                                    jabatan: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <label
                                htmlFor="unit_kerja"
                                className="text-sm font-medium text-foreground"
                              >
                                Unit Kerja
                              </label>
                              <input
                                type="text"
                                id="unit_kerja"
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                placeholder="Enter unit kerja"
                                value={newTunjanganKinerja.unit_kerja}
                                onChange={(e) =>
                                  setNewTunjanganKinerja({
                                    ...newTunjanganKinerja,
                                    unit_kerja: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label
                              htmlFor="tunjangan_kinerja"
                              className="text-sm font-medium text-foreground"
                            >
                              Tunjangan Kinerja
                            </label>
                            <input
                              type="number"
                              id="tunjangan_kinerja"
                              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                              placeholder="Enter tunjangan kinerja amount"
                              value={newTunjanganKinerja.tunjangan_kinerja}
                              onChange={(e) =>
                                setNewTunjanganKinerja({
                                  ...newTunjanganKinerja,
                                  tunjangan_kinerja: e.target.value,
                                })
                              }
                            />
                          </div>
                          <Button
                            disabled={isAddingTunjanganKinerja}
                            onClick={addTunjanganKinerja}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                          >
                            {isAddingTunjanganKinerja
                              ? "Adding..."
                              : "Add Tunjangan Kinerja"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ADK Tukin Upload Tab */}
                  {activeTab === "adk-tukin" && (
                    <div className="space-y-6">
                      <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                        <CardHeader className="border-b border-border bg-muted/30">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Upload className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                Upload ADK Tukin Files
                              </CardTitle>
                              <CardDescription>
                                Upload ADK Tukin Excel files for different
                                employee types
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">
                                Employee Type
                              </label>
                              <select
                                value={selectedEmployeeType}
                                onChange={(e) =>
                                  setSelectedEmployeeType(e.target.value)
                                }
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                              >
                                <option value="CPNS Mandiri">
                                  CPNS Mandiri
                                </option>
                                <option value="CPNS BSI">CPNS BSI</option>
                                <option value="CPNS BNI">CPNS BNI</option>
                                <option value="PNS">PNS</option>
                                <option value="PPPK">PPPK</option>
                              </select>
                            </div>

                            <div
                              className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                              onDragOver={handleDragOver}
                              onClick={() =>
                                adkTukinFileInputRef.current?.click()
                              }
                            >
                              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet className="w-7 h-7 text-primary" />
                              </div>
                              <p className="text-lg font-semibold text-foreground mb-2">
                                {isUploadingAdkTukin
                                  ? "Uploading file..."
                                  : "Choose an ADK Tukin file or drag it here"}
                              </p>
                              <p className="text-sm text-muted-foreground mb-6">
                                Supports .xlsx and .xls files for{" "}
                                {selectedEmployeeType}
                              </p>
                              <Button
                                disabled={isUploadingAdkTukin}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6"
                              >
                                {isUploadingAdkTukin
                                  ? "Uploading..."
                                  : "Select File"}
                              </Button>
                              <input
                                ref={adkTukinFileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleAdkTukinFileUpload}
                                className="hidden"
                              />
                            </div>

                            {adkTukinError && (
                              <Alert
                                className="border-destructive/50 bg-destructive/10"
                                variant="destructive"
                              >
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  {adkTukinError}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Display uploaded files */}
                      {adkTukinFiles.length > 0 && (
                        <Card className="border-border shadow-sm bg-white/80 backdrop-blur-sm">
                          <CardHeader className="border-b border-border bg-muted/30">
                            <CardTitle className="text-lg">
                              Uploaded ADK Tukin Files
                            </CardTitle>
                            <CardDescription>
                              {adkTukinFiles.length} files uploaded
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-b border-border">
                                    <TableHead className="font-semibold text-foreground">
                                      Employee Type
                                    </TableHead>
                                    <TableHead className="font-semibold text-foreground">
                                      Period
                                    </TableHead>
                                    <TableHead className="font-semibold text-foreground">
                                      File Name
                                    </TableHead>
                                    <TableHead className="font-semibold text-foreground">
                                      Records
                                    </TableHead>
                                    <TableHead className="font-semibold text-foreground">
                                      Uploaded At
                                    </TableHead>
                                    <TableHead className="text-right font-semibold text-foreground">
                                      Actions
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {adkTukinFiles.map((file) => (
                                    <TableRow
                                      key={file.id}
                                      className="border-b border-border hover:bg-muted/50"
                                    >
                                      <TableCell className="font-medium">
                                        {file.employee_type}
                                      </TableCell>
                                      <TableCell>
                                        {file.period_month}/{file.period_year}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {file.file_name}
                                      </TableCell>
                                      <TableCell>
                                        {file.file_data?.length || 0} records
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {new Date(
                                          file.created_at
                                        ).toLocaleDateString("id-ID", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              downloadAdkTukinFile(file)
                                            }
                                            className="text-primary hover:text-primary hover:bg-primary/10"
                                          >
                                            <Download className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              deleteAdkTukinFile(file.id)
                                            }
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
