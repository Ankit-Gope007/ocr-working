// metaForgeryChecker.ts
import { exiftool } from "exiftool-vendored";
import sharp from "sharp";
import fs from "fs";
import fileType from "file-type";
const { fileTypeFromBuffer } = fileType;

type MetaReport = {
  file: string;
  format?: string | null;
  mimeFromContent?: string | null;
  metadata: any | null;
  checks: { [k: string]: { score: number; note?: string } };
  totalScore: number; // 0..100 float
  verdict: "clean" | "suspicious" | "likely_forged";
  summary: string[];
};

const WEIGHTS: { [k: string]: number } = {
  softwareTag: 40,      // strong indicator if editing software is present
  timestampMismatch: 20,
  missingExif: 10,
  unusualCamera: 10,
  gpsInconsistency: 10,
  thumbnailMismatch: 10,
};

function clamp(v: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, v));
}

export async function analyzeMetadata(filePath: string): Promise<MetaReport> {
  const report: MetaReport = {
    file: filePath,
    metadata: null,
    checks: {},
    totalScore: 0,
    verdict: "clean",
    format: null,
    mimeFromContent: null,
    summary: [],
  };

  // 0. quick format/mime check using file content
  try {
    const buf = await fs.promises.readFile(filePath);
    const ft = await fileTypeFromBuffer(buf);
    report.mimeFromContent = ft?.mime ?? null;
    report.mimeFromContent = ft?.mime ?? null;
  } catch (e) {
    report.mimeFromContent = null;
  }

  // 1. read metadata via exiftool
  let meta: any = null;
  try {
    meta = await exiftool.read(filePath);
    report.metadata = meta;
  } catch (err) {
    report.metadata = null;
    report.checks["missingExif"] = {
      score: WEIGHTS.missingExif,
      note: "Could not read EXIF/metadata (exiftool error).",
    };
  }

  // Helper to add check
  function addCheck(key: string, score: number, note?: string) {
    report.checks[key] = { score: clamp(score), note };
    report.totalScore += clamp(score);
  }

  // If no metadata at all, mark missing
  if (!meta) {
    addCheck("missingExif", WEIGHTS.missingExif, "No EXIF/metadata found or read error.");
  } else {
    // 2. software/editing tag(s)
    const softwareTags = [
      meta.Software,
      meta.ProcessingSoftware,
      meta.Editor,
      meta.CreatorTool,
      meta.SoftwareVersion,
    ].filter(Boolean).join(" ") || "";

    if (softwareTags) {
      const s = String(softwareTags);
      const lower = s.toLowerCase();
      // keywords that strongly indicate editing tools
      const editors = ["photoshop", "gimp", "pixlr", "snapseed", "lightroom", "affinity", "pixelmator", "paint.net"];
      const matched = editors.filter(e => lower.includes(e));
      if (matched.length > 0) {
        addCheck("softwareTag", WEIGHTS.softwareTag, `Found editing software tags: ${matched.join(", ")}`);
      } else {
        // software present but not obviously an editor (camera maker, app)
        addCheck("softwareTag", WEIGHTS.softwareTag * 0.4, `Software tag present but not a known editor: "${s}"`);
      }
    } else {
      addCheck("softwareTag", 0, "No software/creator tool tag found.");
    }

    // 3. timestamp mismatch (CreateDate vs ModifyDate vs DateTimeOriginal)
    const cd = meta.CreateDate || meta.ModifyDate || meta.DateTimeOriginal || meta.FileModifyDate || null;
    const md = meta.ModifyDate || meta.FileModifyDate || null;
    let tsScore = 0;
    let tsNote = "";
    if (meta.CreateDate && meta.ModifyDate && meta.CreateDate !== meta.ModifyDate) {
      tsScore = WEIGHTS.timestampMismatch;
      tsNote = `CreateDate (${meta.CreateDate}) != ModifyDate (${meta.ModifyDate})`;
    } else if (meta.DateTimeOriginal && meta.ModifyDate && meta.DateTimeOriginal !== meta.ModifyDate) {
      tsScore = WEIGHTS.timestampMismatch * 0.8;
      tsNote = `DateTimeOriginal (${meta.DateTimeOriginal}) != ModifyDate (${meta.ModifyDate})`;
    } else {
      tsScore = 0;
      tsNote = "No obvious timestamp mismatch.";
    }
    addCheck("timestampMismatch", tsScore, tsNote);

    // 4. thumbnail mismatch: some editors strip or replace thumbnails
    if (meta.ThumbnailImage) {
      addCheck("thumbnailMismatch", 0, "Thumbnail present.");
    } else {
      // missing thumbnail could be normal for some devices; give small weight
      addCheck("thumbnailMismatch", WEIGHTS.thumbnailMismatch * 0.3, "No embedded thumbnail.");
    }

    // 5. camera/maker presence: absence or weird values
    if (!meta.Make && !meta.Model) {
      addCheck("unusualCamera", WEIGHTS.unusualCamera * 0.6, "No camera Make/Model in EXIF.");
    } else {
      // if Make/Model looks like editing software, increase suspicion
      const makeModel = `${meta.Make || ""} ${meta.Model || ""}`.toLowerCase();
      if (/android|iphone|samsung|xiaomi|pixel|canon|nikon|sony/.test(makeModel)) {
        addCheck("unusualCamera", 0, `Camera Make/Model present: ${makeModel}`);
      } else {
        addCheck("unusualCamera", 0, `Camera Make/Model: ${makeModel}`);
      }
    }

    // 6. GPS inconsistency (if GPS present)
    if (meta.GPSLatitude || meta.GPSLongitude) {
      // presence is not suspicious; but inconsistent values (e.g., zeros) are
      const lat = meta.GPSLatitude;
      const lon = meta.GPSLongitude;
      if (lat === 0 && lon === 0) {
        addCheck("gpsInconsistency", WEIGHTS.gpsInconsistency * 0.8, "GPS 0,0 suspicious (likely placeholder).");
      } else {
        addCheck("gpsInconsistency", 0, `GPS present: ${String(lat)}, ${String(lon)}`);
      }
    } else {
      addCheck("gpsInconsistency", 0, "No GPS tags.");
    }
  }

  // Normalize totalScore to 0..100 (sum of weights may be less/more; we already used weights)
  report.totalScore = clamp(report.totalScore, 0, 100);

  // Compose verdict
  if (report.totalScore >= 60) {
    report.verdict = "likely_forged";
  } else if (report.totalScore >= 25) {
    report.verdict = "suspicious";
  } else {
    report.verdict = "clean";
  }

  // Summary lines
  if (report.metadata) {
    if (report.checks.softwareTag?.note) report.summary.push(report.checks.softwareTag.note);
    if (report.checks.timestampMismatch?.note) report.summary.push(report.checks.timestampMismatch.note);
    if (report.checks.unusualCamera?.note) report.summary.push(report.checks.unusualCamera.note);
    if (report.checks.gpsInconsistency?.note) report.summary.push(report.checks.gpsInconsistency.note);
    if (report.checks.thumbnailMismatch?.note) report.summary.push(report.checks.thumbnailMismatch.note);
  } else {
    report.summary.push("No metadata available to inspect.");
  }

  // Close exiftool process (important)
  try { await exiftool.end(); } catch (_) {}

  return report;
}