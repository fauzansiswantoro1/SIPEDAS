import Link from "next/link";
import { FileSpreadsheet, Archive, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  const features = [
    {
      title: "Uang Makan",
      description:
        "Fitur ini memungkinkan pengguna mengunggah data kehadiran pegawai dalam format Excel untuk menghitung uang makan secara otomatis. Sistem kemudian menghasilkan file ADK yang siap diunduh.",
      icon: FileSpreadsheet,
      href: "/adkUM",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Arsip File ADK",
      description:
        "Fitur ini digunakan untuk menyimpan dan mengelola seluruh file ADK yang telah dihasilkan. Pengguna dapat melihat, mengunduh, atau menelusuri riwayat file ADK berdasarkan periode tertentu.",
      icon: Archive,
      href: "/arsipADK",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Tunjangan Kinerja",
      description:
        "Fitur ini berfungsi untuk mengolah dan menghitung tunjangan kinerja pegawai berdasarkan data absensi dan menghasilkan format ADK. Sistem secara otomatis merekap data kehadiran dan kinerja.",
      icon: DollarSign,
      href: "/tunjanganKinerjaData",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/indonesian-building.png')" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-7xl font-bold text-slate-900 mb-4 text-balance">
            SIPEDAS
          </h1>
          <p className="text-3xl text-slate-700 mb-4 font-medium">
            Sistem Pengolahan Data Absensi
          </p>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto text-pretty">
            sistem berbasis web yang dikembangkan untuk mendukung proses
            pengolahan data absensi pegawai secara cepat, efisien, dan akurat.
            Sistem ini dirancang untuk mempermudah pengolahan data kehadiran
            pegawai yang menjadi dasar dalam perhitungan uang makan dan
            tunjangan kinerja
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.href}
                className="group hover:shadow-xl transition-all duration-300 border-slate-200 hover:border-slate-300 bg-white/40"
              >
                <CardHeader>
                  <div
                    className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-2xl text-slate-900">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base text-slate-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={feature.href}>
                    <Button
                      className="w-full group/btn bg-slate-900 hover:bg-slate-800 text-white"
                      size="lg"
                    >
                      Open Module
                      <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats or Info Section */}
        <div className="bg-white/40 rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">
            Keunggulan Sistem
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2" />
              <div>
                <h3 className="font-medium text-slate-900 mb-1">
                  Excel Integration
                </h3>
                <p className="text-sm text-slate-600">
                  Mudah mengunggah file berformat excel
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
              <div>
                <h3 className="font-medium text-slate-900 mb-1">
                  Fast and Efficient
                </h3>
                <p className="text-sm text-slate-600">
                  Proses pengolahan data yang cepat
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2" />
              <div>
                <h3 className="font-medium text-slate-900 mb-1">Data Export</h3>
                <p className="text-sm text-slate-600">
                  Download data hasil olahan dalam berbagai format
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
