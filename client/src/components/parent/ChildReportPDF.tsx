import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
  child: { id: string; name: string; totalPoints: number };
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    pointsEarned: number;
    completionRate: number;
  };
  bySubject: Array<{
    subjectId: string;
    name: string;
    total: number;
    completed: number;
    rate: number;
  }>;
}

interface ChildReportPDFProps {
  childId: string;
  childName: string;
}

export function ChildReportPDF({ childId, childName }: ChildReportPDFProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const [period, setPeriod] = useState("weekly");
  const [generating, setGenerating] = useState(false);

  const token = localStorage.getItem("token");

  const { data: reportData } = useQuery<{ success: boolean; data: ReportData }>({
    queryKey: ["child-report", childId, period],
    queryFn: async () => {
      const res = await fetch(`/api/parent/children/${childId}/reports?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
    enabled: !!token && !!childId,
  });

  const generatePDF = async () => {
    if (!reportData?.data) return;
    setGenerating(true);
    
    try {
      const report = reportData.data;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Colors
      const primaryColor: [number, number, number] = [99, 102, 241]; // indigo
      const darkText: [number, number, number] = [31, 41, 55];
      const lightText: [number, number, number] = [107, 114, 128];
      const successColor: [number, number, number] = [34, 197, 94];
      const warningColor: [number, number, number] = [234, 179, 8];

      let y = 20;

      // Header bar
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Classify", 105, 18, { align: "center" });
      doc.setFontSize(12);
      doc.text(t("childReport.title", { name: childName }), 105, 30, { align: "center" });

      y = 50;

      // Report info
      doc.setTextColor(...darkText);
      doc.setFontSize(10);
      const periodLabel = t(`childReport.period_${period}`);
      const startDate = new Date(report.startDate).toLocaleDateString(isRTL ? "ar-EG" : i18n.language);
      const endDate = new Date(report.endDate).toLocaleDateString(isRTL ? "ar-EG" : i18n.language);
      doc.text(`${t("childReport.periodLabel")}: ${periodLabel}`, 15, y);
      doc.text(`${t("childReport.dateRange")}: ${startDate} - ${endDate}`, 15, y + 6);
      doc.text(`${t("childReport.generatedAt")}: ${new Date().toLocaleDateString(isRTL ? "ar-EG" : i18n.language)}`, 15, y + 12);

      y += 25;

      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text(t("childReport.summary"), 15, y);
      y += 3;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 8;

      // Summary cards as table
      const summaryData = [
        [t("childReport.totalTasks"), String(report.summary.totalTasks)],
        [t("childReport.completedTasks"), String(report.summary.completedTasks)],
        [t("childReport.pendingTasks"), String(report.summary.pendingTasks)],
        [t("childReport.pointsEarned"), String(report.summary.pointsEarned)],
        [t("childReport.completionRate"), `${report.summary.completionRate}%`],
        [t("childReport.totalPoints"), String(report.child.totalPoints)],
      ];

      autoTable(doc, {
        startY: y,
        head: [[t("childReport.metric"), t("childReport.value")]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 10, halign: "center" },
        bodyStyles: { fontSize: 10, halign: "center" },
        columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
        margin: { left: 15, right: 15 },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // Completion rate visual
      const rate = report.summary.completionRate;
      const rateColor = rate >= 80 ? successColor : rate >= 50 ? warningColor : [239, 68, 68] as [number, number, number];
      doc.setFontSize(12);
      doc.setTextColor(...darkText);
      doc.text(t("childReport.performanceRating"), 15, y);
      y += 6;
      
      // Progress bar
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(15, y, 180, 8, 2, 2, "F");
      doc.setFillColor(...rateColor);
      doc.roundedRect(15, y, Math.max(1, (180 * rate) / 100), 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      if (rate > 10) {
        doc.text(`${rate}%`, 15 + (180 * rate) / 200, y + 5.5, { align: "center" });
      }

      y += 18;

      // By subject section
      if (report.bySubject.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text(t("childReport.bySubject"), 15, y);
        y += 3;
        doc.setDrawColor(...primaryColor);
        doc.line(15, y, 195, y);
        y += 8;

        const subjectData = report.bySubject.map(s => [
          s.name,
          String(s.total),
          String(s.completed),
          `${s.rate}%`,
        ]);

        autoTable(doc, {
          startY: y,
          head: [[
            t("childReport.subject"),
            t("childReport.totalTasks"),
            t("childReport.completedTasks"),
            t("childReport.completionRate"),
          ]],
          body: subjectData,
          theme: "striped",
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 10, halign: "center" },
          bodyStyles: { fontSize: 10, halign: "center" },
          columnStyles: { 0: { halign: "left" } },
          margin: { left: 15, right: 15 },
        });

        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageHeight - 20, 210, 20, "F");
      doc.setTextColor(...lightText);
      doc.setFontSize(8);
      doc.text("Classify - Educational Platform", 105, pageHeight - 12, { align: "center" });
      doc.text(`classi-fy.com`, 105, pageHeight - 7, { align: "center" });

      // Save
      const fileName = `classify_report_${childName.replace(/\s+/g, "_")}_${period}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className={`w-[120px] h-8 text-xs ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">{t("childReport.daily")}</SelectItem>
          <SelectItem value="weekly">{t("childReport.weekly")}</SelectItem>
          <SelectItem value="monthly">{t("childReport.monthly")}</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        onClick={generatePDF}
        disabled={generating || !reportData?.data}
        className="h-8 text-xs gap-1"
      >
        {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
        {t("childReport.exportPDF")}
      </Button>
    </div>
  );
}
