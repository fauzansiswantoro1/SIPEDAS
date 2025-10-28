"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Trash2,
  Search,
  FileText,
  Calendar,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";

interface ADKArchive {
  id: string;
  file_name: string;
  file_content: string;
  employee_type: string;
  period_month: string;
  period_year: string;
  calculation_results: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TunjanganKinerjaArchive {
  id: string;
  period_month: string;
  period_year: string;
  period_start_date: string;
  period_end_date: string;
  calculation_results: any[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ADKTukinArchive {
  id: string;
  employee_type: string;
  period_month: string;
  period_year: string;
  file_data: any[];
  file_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function ArsipADKPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [archives, setArchives] = useState<ADKArchive[]>([]);
  const [filteredArchives, setFilteredArchives] = useState<ADKArchive[]>([]);
  const [tunjanganArchives, setTunjanganArchives] = useState<
    TunjanganKinerjaArchive[]
  >([]);
  const [filteredTunjanganArchives, setFilteredTunjanganArchives] = useState<
    TunjanganKinerjaArchive[]
  >([]);
  const [adkTukinArchives, setAdkTukinArchives] = useState<ADKTukinArchive[]>(
    []
  );
  const [filteredAdkTukinArchives, setFilteredAdkTukinArchives] = useState<
    ADKTukinArchive[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"uangMakan" | "tunjanganKinerja">(
    "uangMakan"
  );
  const [expandedCalculations, setExpandedCalculations] = useState<Set<string>>(
    new Set()
  );
  const [expandedTunjanganCalculations, setExpandedTunjanganCalculations] =
    useState<Set<string>>(new Set());
  const [expandedAdkTukinFiles, setExpandedAdkTukinFiles] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchArchives();
      fetchTunjanganArchives();
      fetchAdkTukinArchives();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    filterArchives();
    filterTunjanganArchives();
    filterAdkTukinArchives();
  }, [searchTerm, selectedType, archives, tunjanganArchives, adkTukinArchives]);

  const checkAuth = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const fetchArchives = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("adk_archives")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setArchives(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchTunjanganArchives = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tunjangan_kinerja_archives")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTunjanganArchives(data || []);
    } catch (err: any) {
      console.error("Error fetching tunjangan archives:", err);
      setError(err.message);
    }
  };

  const fetchAdkTukinArchives = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("adk_tukin_archives")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAdkTukinArchives(data || []);
    } catch (err: any) {
      console.error("Error fetching ADK Tukin archives:", err);
      setError(err.message);
    }
  };

  const filterArchives = () => {
    let filtered = archives;

    if (selectedType !== "all") {
      filtered = filtered.filter(
        (archive) => archive.employee_type === selectedType
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (archive) =>
          archive.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          archive.period_month.includes(searchTerm) ||
          archive.period_year.includes(searchTerm)
      );
    }

    setFilteredArchives(filtered);
  };

  const filterTunjanganArchives = () => {
    let filtered = tunjanganArchives;

    if (searchTerm) {
      filtered = filtered.filter(
        (archive) =>
          archive.period_month.includes(searchTerm) ||
          archive.period_year.includes(searchTerm)
      );
    }

    setFilteredTunjanganArchives(filtered);
  };

  const filterAdkTukinArchives = () => {
    let filtered = adkTukinArchives;

    if (searchTerm) {
      filtered = filtered.filter(
        (archive) =>
          archive.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          archive.period_month.includes(searchTerm) ||
          archive.period_year.includes(searchTerm) ||
          archive.employee_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAdkTukinArchives(filtered);
  };

  const handleDownload = (archive: ADKArchive) => {
    const blob = new Blob([archive.file_content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = archive.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this archive?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("adk_archives")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setArchives(archives.filter((archive) => archive.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTunjanganArchive = async (id: string) => {
    if (!confirm("Are you sure you want to delete this archive?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("tunjangan_kinerja_archives")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTunjanganArchives(
        tunjanganArchives.filter((archive) => archive.id !== id)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAdkTukinArchive = async (id: string) => {
    if (!confirm("Are you sure you want to delete this archive?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("adk_tukin_archives")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAdkTukinArchives(
        adkTukinArchives.filter((archive) => archive.id !== id)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleCalculations = (archiveId: string) => {
    const newExpanded = new Set(expandedCalculations);
    if (newExpanded.has(archiveId)) {
      newExpanded.delete(archiveId);
    } else {
      newExpanded.add(archiveId);
    }
    setExpandedCalculations(newExpanded);
  };

  const toggleTunjanganCalculations = (archiveId: string) => {
    const newExpanded = new Set(expandedTunjanganCalculations);
    if (newExpanded.has(archiveId)) {
      newExpanded.delete(archiveId);
    } else {
      newExpanded.add(archiveId);
    }
    setExpandedTunjanganCalculations(newExpanded);
  };

  const toggleAdkTukinFile = (archiveId: string) => {
    const newExpanded = new Set(expandedAdkTukinFiles);
    if (newExpanded.has(archiveId)) {
      newExpanded.delete(archiveId);
    } else {
      newExpanded.add(archiveId);
    }
    setExpandedAdkTukinFiles(newExpanded);
  };

  const downloadCalculationExcel = (archive: ADKArchive) => {
    if (!archive.calculation_results) return;

    const wb = XLSX.utils.book_new();

    // Prepare data for Excel
    const calculations = Object.values(archive.calculation_results);

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
      ...calculations.map((calc: any) => [
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

    // Add summary rows
    const totalEmployees = calculations.length;
    const grandTotalGross = calculations.reduce(
      (sum: number, calc: any) => sum + (calc.baseAmount || 0),
      0
    );
    const grandTotalTax = calculations.reduce(
      (sum: number, calc: any) => sum + (calc.taxAmount || 0),
      0
    );
    const grandTotalNet = calculations.reduce(
      (sum: number, calc: any) => sum + (calc.totalUangMakan || 0),
      0
    );

    excelData.push([]);
    excelData.push(["TOTAL PEGAWAI", totalEmployees, "", "", "", "", "", ""]);
    excelData.push(["TOTAL KOTOR", "", "", "", "", grandTotalGross, "", ""]);
    excelData.push(["TOTAL PAJAK", "", "", "", "", "", grandTotalTax, ""]);
    excelData.push(["TOTAL BERSIH", "", "", "", "", "", "", grandTotalNet]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Calculation Results");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Calculation_${archive.employee_type}_${archive.period_year}${archive.period_month}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadTunjanganCalculationExcel = (
    archive: TunjanganKinerjaArchive
  ) => {
    if (!archive.calculation_results) return;

    const wb = XLSX.utils.book_new();

    const excelData = [
      [
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
      ],
      ...archive.calculation_results.map((r: any) => [
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
      ]),
    ];

    // Add summary
    const totalEmployees = archive.calculation_results.length;
    const totalBefore = archive.calculation_results.reduce(
      (sum: number, r: any) => sum + (r.tunjanganBefore || 0),
      0
    );
    const totalCut = archive.calculation_results.reduce(
      (sum: number, r: any) => sum + (r.nominalCut || 0),
      0
    );
    const totalAfter = archive.calculation_results.reduce(
      (sum: number, r: any) => sum + (r.tunjanganAfter || 0),
      0
    );

    excelData.push([]);
    excelData.push(["TOTAL PEGAWAI", totalEmployees]);
    excelData.push([
      "TOTAL TUNJANGAN BEFORE",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalBefore,
    ]);
    excelData.push([
      "TOTAL NOMINAL CUT",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalCut,
    ]);
    excelData.push([
      "TOTAL TUNJANGAN AFTER",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalAfter,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Tunjangan Kinerja");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Tunjangan_Kinerja_${archive.period_year}${archive.period_month}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAdkTukinExcel = (archive: ADKTukinArchive) => {
    try {
      const ws = XLSX.utils.aoa_to_sheet(archive.file_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        ws,
        `ADK Tukin ${archive.employee_type}`
      );

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = archive.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error downloading file: " + (error as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-amber-50 to-orange-50 relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: "url('/images/arsip-background.png')" }}
      />
      <div className="fixed inset-0 bg-gradient-to-br from-white/90 via-amber-50/85 to-orange-50/90 -z-10" />

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Arsip File ADK
            </h1>
            <p className="text-muted-foreground mt-2">
              Archive of generated ADK files and calculation results
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("uangMakan")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "uangMakan"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Uang Makan
          </button>
          <button
            onClick={() => setActiveTab("tunjanganKinerja")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "tunjanganKinerja"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tunjangan Kinerja
          </button>
        </div>

        {activeTab === "uangMakan" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Filter Archives</CardTitle>
                <CardDescription>
                  Search and filter archived ADK files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by filename, month, or year..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-4 py-2 border rounded-md bg-background"
                  >
                    <option value="all">All Types</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">ADK File Archives</h2>
              {filteredArchives.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No archives found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredArchives.map((archive) => (
                  <Card key={archive.id}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* File Info */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">
                                {archive.file_name}
                              </h3>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span className="font-medium">
                                  {archive.employee_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(
                                    archive.period_year,
                                    Number.parseInt(archive.period_month) - 1
                                  ).toLocaleDateString("id-ID", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              <div>
                                Created:{" "}
                                {new Date(
                                  archive.created_at
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleDownload(archive)}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download TXT
                            </Button>
                            <Button
                              onClick={() => handleDelete(archive.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Calculation Results Section */}
                        {archive.calculation_results &&
                          Object.keys(archive.calculation_results).length >
                            0 && (
                            <div className="border-t pt-4">
                              <div className="flex items-center justify-between mb-2">
                                <button
                                  onClick={() => toggleCalculations(archive.id)}
                                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                                >
                                  {expandedCalculations.has(archive.id) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                  Calculation Results (
                                  {
                                    Object.keys(archive.calculation_results)
                                      .length
                                  }{" "}
                                  employees)
                                </button>
                                <Button
                                  onClick={() =>
                                    downloadCalculationExcel(archive)
                                  }
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download Excel
                                </Button>
                              </div>

                              {expandedCalculations.has(archive.id) && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                      <tr>
                                        <th className="px-4 py-2 text-left">
                                          Nama
                                        </th>
                                        <th className="px-4 py-2 text-left">
                                          NIP
                                        </th>
                                        <th className="px-4 py-2 text-left">
                                          Golongan
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          WFO Days
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          Base Amount
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          Tax (5%)
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.entries(
                                        archive.calculation_results
                                      ).map(([nip, calc]: [string, any]) => (
                                        <tr key={nip} className="border-b">
                                          <td className="px-4 py-2">
                                            {calc.nama || "-"}
                                          </td>
                                          <td className="px-4 py-2 font-mono text-xs">
                                            {nip}
                                          </td>
                                          <td className="px-4 py-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                                              {calc.golongan || "-"}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            {calc.wfoDays || 0}
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            Rp{" "}
                                            {(
                                              calc.baseAmount || 0
                                            ).toLocaleString("id-ID")}
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            Rp{" "}
                                            {(
                                              calc.taxAmount || 0
                                            ).toLocaleString("id-ID")}
                                          </td>
                                          <td className="px-4 py-2 text-right font-semibold">
                                            Rp{" "}
                                            {(
                                              calc.totalUangMakan || 0
                                            ).toLocaleString("id-ID")}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === "tunjanganKinerja" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Filter Archives</CardTitle>
                <CardDescription>
                  Search and filter tunjangan kinerja archives
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by month, year, or employee type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ADK Tukin Archives Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">
                ADK Tukin File Archives
              </h2>
              {filteredAdkTukinArchives.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No ADK Tukin archives found
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredAdkTukinArchives.map((archive) => (
                  <Card key={archive.id}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">
                                {archive.file_name}
                              </h3>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span className="font-medium">
                                  {archive.employee_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(
                                    archive.period_year,
                                    Number.parseInt(archive.period_month) - 1
                                  ).toLocaleDateString("id-ID", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              <div>
                                Created:{" "}
                                {new Date(
                                  archive.created_at
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => downloadAdkTukinExcel(archive)}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Excel
                            </Button>
                            <Button
                              onClick={() =>
                                handleDeleteAdkTukinArchive(archive.id)
                              }
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* File preview section */}
                        {archive.file_data && archive.file_data.length > 0 && (
                          <div className="border-t pt-4">
                            <button
                              onClick={() => toggleAdkTukinFile(archive.id)}
                              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-2"
                            >
                              {expandedAdkTukinFiles.has(archive.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                              View File Details ({archive.file_data.length - 1}{" "}
                              employees)
                            </button>

                            {expandedAdkTukinFiles.has(archive.id) && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted">
                                    <tr>
                                      {archive.file_data[0]
                                        .slice(0, 10)
                                        .map(
                                          (header: string, index: number) => (
                                            <th
                                              key={index}
                                              className="px-4 py-2 text-left"
                                            >
                                              {header}
                                            </th>
                                          )
                                        )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {archive.file_data
                                      .slice(1, 11)
                                      .map((row: any[], rowIndex: number) => (
                                        <tr key={rowIndex} className="border-b">
                                          {row
                                            .slice(0, 10)
                                            .map(
                                              (
                                                cell: any,
                                                cellIndex: number
                                              ) => (
                                                <td
                                                  key={cellIndex}
                                                  className="px-4 py-2"
                                                >
                                                  {cell}
                                                </td>
                                              )
                                            )}
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                                {archive.file_data.length > 11 && (
                                  <p className="text-sm text-muted-foreground mt-2 text-center">
                                    ... and {archive.file_data.length - 11} more
                                    rows
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Existing Tunjangan Kinerja Calculation Archives */}
            <div className="space-y-4 mt-8">
              <h2 className="text-2xl font-semibold">
                Tunjangan Kinerja Calculation Archives
              </h2>
              {filteredTunjanganArchives.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No archives found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTunjanganArchives.map((archive) => (
                  <Card key={archive.id}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">
                                Tunjangan Kinerja Calculation -{" "}
                                {archive.period_year}/{archive.period_month}
                              </h3>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Period:{" "}
                                  {new Date(
                                    archive.period_start_date
                                  ).toLocaleDateString("id-ID")}{" "}
                                  to{" "}
                                  {new Date(
                                    archive.period_end_date
                                  ).toLocaleDateString("id-ID")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>
                                  {archive.calculation_results?.length || 0}{" "}
                                  employees
                                </span>
                              </div>
                              <div>
                                Created:{" "}
                                {new Date(
                                  archive.created_at
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                downloadTunjanganCalculationExcel(archive)
                              }
                              variant="outline"
                              size="sm"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Excel
                            </Button>
                            <Button
                              onClick={() =>
                                handleDeleteTunjanganArchive(archive.id)
                              }
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {archive.calculation_results &&
                          archive.calculation_results.length > 0 && (
                            <div className="border-t pt-4">
                              <button
                                onClick={() =>
                                  toggleTunjanganCalculations(archive.id)
                                }
                                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-2"
                              >
                                {expandedTunjanganCalculations.has(
                                  archive.id
                                ) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                View Calculation Details (
                                {archive.calculation_results.length} employees)
                              </button>

                              {expandedTunjanganCalculations.has(
                                archive.id
                              ) && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                      <tr>
                                        <th className="px-4 py-2 text-left">
                                          Nama
                                        </th>
                                        <th className="px-4 py-2 text-left">
                                          NIP
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          Total Days
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          Tunjangan Before
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          Cut %
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          Nominal Cut
                                        </th>
                                        <th className="px-4 py-2 text-right">
                                          Tunjangan After
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {archive.calculation_results.map(
                                        (record: any, index: number) => (
                                          <tr key={index} className="border-b">
                                            <td className="px-4 py-2">
                                              {record.nama}
                                            </td>
                                            <td className="px-4 py-2 font-mono text-xs">
                                              {record.nip}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              {record.totalDays}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              Rp{" "}
                                              {(
                                                record.tunjanganBefore || 0
                                              ).toLocaleString("id-ID")}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                                                  record.cutPercentage === 0
                                                    ? "bg-green-100 text-green-800"
                                                    : record.cutPercentage <= 10
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-red-100 text-red-800"
                                                }`}
                                              >
                                                {record.cutPercentage}%
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-right text-red-600">
                                              Rp{" "}
                                              {(
                                                record.nominalCut || 0
                                              ).toLocaleString("id-ID")}
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold">
                                              Rp{" "}
                                              {(
                                                record.tunjanganAfter || 0
                                              ).toLocaleString("id-ID")}
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
