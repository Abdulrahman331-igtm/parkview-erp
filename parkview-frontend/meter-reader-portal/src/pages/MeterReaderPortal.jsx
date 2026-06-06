import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  ChevronRight,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Zap,
  Droplets,
  LogOut,
  ClipboardCheck,
  History,
  User as UserIcon,
} from "lucide-react";

const WINDOW_DAYS = 7;

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function MeterReaderPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation step
  const [step, setStep] = useState("floor");

  // Data states
  const [floors, setFloors] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [recentReadings, setRecentReadings] = useState([]);

  // Form states
  const [kplc, setKplc] = useState("");
  const [water, setWater] = useState("");
  // const [photoName, setPhotoName] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [loading, setLoading] = useState(false);

  // const fileRef = useRef(null);

  // Initial data load
  useEffect(() => {
    loadFloors();
    loadRecentReadings();
  }, []);

  const loadFloors = async () => {
    try {
      setLoading(true);
      const data = await api.fetchFloorsAndUnits();
      setGroupedData(data);

      const floorList = Object.keys(data).map((floorName) => ({
        level: floorName,
        label: floorName,
      }));
      setFloors(floorList);
    } catch (err) {
      toast.error("Failed to load building data");
    } finally {
      setLoading(false);
    }
  };

  const loadRecentReadings = async () => {
    try {
      const data = await api.fetchRecentReadings(WINDOW_DAYS);
      setRecentReadings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const unitsForLevel = useMemo(() => {
    if (!selectedLevel) return [];
    return (groupedData[selectedLevel] || [])
      .slice()
      .sort((a, b) =>
        a.unit_number.localeCompare(b.unit_number, undefined, {
          numeric: true,
        })
      );
  }, [selectedLevel, groupedData]);

  const getReadUnitIds = () =>
    new Set(recentReadings.map((r) => String(r.unit_id)));

  const goToFloors = () => {
    setStep("floor");
    setSelectedLevel(null);
    setSelectedUnit(null);
  };

  const pickFloor = (floorName) => {
    setSelectedLevel(floorName);
    setStep("unit");
  };

  const pickUnit = (u) => {
    if (!u?.id) {
      toast.error("Invalid unit selected");
      return;
    }
    setSelectedUnit(u);
    setKplc("");
    setWater("");
    // setPhotoName(null);
    setStep("form");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUnit?.id) {
      toast.error("No unit selected");
      return;
    }

    const kplcNum = kplc ? Number(kplc) : undefined;
    const waterNum = water ? Number(water) : undefined;

    if (kplcNum == null && waterNum == null) {
      toast.error("Enter at least one reading");
      return;
    }

    if (
      (kplcNum != null && (isNaN(kplcNum) || kplcNum < 0)) ||
      (waterNum != null && (isNaN(waterNum) || waterNum < 0))
    ) {
      toast.error("Reading must be a positive number");
      return;
    }

    try {
      const saved = await api.submitReading({
        unit_id: selectedUnit.id,
        unit_name: selectedUnit.unit_number,
        level: selectedUnit.floor,
        reader_id: user?.id ?? "unknown",
        reader_name: user?.name ?? "Unknown",
        timestamp: new Date().toISOString(),
        kplc: kplcNum,
        water: waterNum,
        // photoName: photoName ?? undefined,
      });

      setLastSubmission(saved);
      setSessionCount((c) => c + 1);
      toast.success(`Reading saved for ${selectedUnit.unit_number}`);
      setStep("success");
      loadRecentReadings();
    } catch (err) {
      toast.error("Failed to save reading");
    }
  };

  const nextUnit = () => {
    const readIds = getReadUnitIds();
    const remaining = unitsForLevel.find(
      (u) => !readIds.has(String(u.id)) && u.id !== selectedUnit?.id
    );
    if (remaining) {
      pickUnit(remaining);
    } else {
      toast("All units on this floor done");
      goToFloors();
    }
  };

  const renderFloorStep = () => (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Select Floor</h2>
          <p className="text-sm text-gray-500">
            Green = read in last {WINDOW_DAYS} days
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setStep("history")}>
          <History className="h-4 w-4 mr-1" /> Past Week
        </Button>
      </div>
      <div className="grid gap-3">
        {floors.map((lvl) => {
          const floorUnits = groupedData[lvl.level] || [];
          const count = floorUnits.length;
          const readIds = getReadUnitIds();
          const doneCount = floorUnits.filter((u) =>
            readIds.has(String(u.id))
          ).length;
          const allDone = count > 0 && doneCount === count;

          return (
            <button
              key={lvl.level}
              onClick={() => pickFloor(lvl.level)}
              className={`w-full border rounded-xl p-4 flex items-center gap-3 text-left ${
                allDone ? "bg-green-50 border-green-300" : "bg-white"
              }`}
            >
              <div
                className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  allDone
                    ? "bg-green-100 text-green-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {allDone ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Building2 className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{lvl.label}</p>
                <p className="text-xs text-gray-500">{lvl.label}</p>
                <p className="text-xs text-gray-400">
                  {doneCount}/{count} read
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderUnitStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={goToFloors}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Floors
        </Button>
      </div>
      <div>
        <h2 className="text-xl font-bold">Level {selectedLevel} · Units</h2>
        <p className="text-sm text-gray-500">Tap a unit to enter readings</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {unitsForLevel.map((u) => {
          const done = getReadUnitIds().has(String(u.id));
          return (
            <button
              key={u.id}
              onClick={() => pickUnit(u)}
              className={`relative rounded-xl border p-3 text-left ${
                done
                  ? "bg-green-50 border-green-300"
                  : "bg-white hover:border-blue-400"
              }`}
            >
              {done && (
                <CheckCircle2 className="h-4 w-4 text-green-600 absolute top-2 right-2" />
              )}
              <p className="font-bold">{u.unit_number}</p>
              <p className="text-xs text-gray-500">{u.unit_type}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderFormStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setStep("unit")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Units
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-gray-500">Reading for</p>
          <h2 className="text-2xl font-bold">{selectedUnit?.unit_number}</h2>
          <p className="text-xs text-gray-500">
            {selectedUnit?.floor} · {selectedUnit?.unit_type}
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Zap className="h-4 w-4" /> KPLC Reading
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 45230"
              value={kplc}
              onChange={(e) => setKplc(e.target.value)}
              className="h-14 text-lg font-mono"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Droplets className="h-4 w-4" /> Water Reading
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 1250"
              value={water}
              onChange={(e) => setWater(e.target.value)}
              className="h-14 text-lg font-mono"
            />
          </CardContent>
        </Card>

        {/* <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="text-base font-semibold">Photo</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full h-14"
            >
              <Camera className="h-5 w-5 mr-2" />
              {photoName ? "Replace Photo" : "Take / Upload Photo"}
            </Button>
            {photoName && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {photoName}
              </p>
            )}
          </CardContent>
        </Card> */}

        <Button type="submit" className="w-full h-14 text-base font-semibold">
          Submit Reading
        </Button>
      </form>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center text-center py-10 space-y-5">
      <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="h-14 w-14 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Reading Saved!</h2>
        <p className="text-sm text-gray-500 mt-1">
          {lastSubmission?.unit_name}
        </p>
      </div>

      <Card className="w-full text-left">
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Unit ID</span>
            <span className="font-mono">{lastSubmission?.unit_id}</span>
          </div>
          {lastSubmission?.kplc != null && (
            <div className="flex justify-between">
              <span className="text-gray-500">KPLC</span>
              <span className="font-mono font-semibold">
                {lastSubmission?.kplc}
              </span>
            </div>
          )}
          {lastSubmission?.water != null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Water</span>
              <span className="font-mono font-semibold">
                {lastSubmission?.water}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 w-full">
        <Button variant="outline" onClick={goToFloors} className="h-14">
          Change Floor
        </Button>
        <Button onClick={nextUnit} className="h-14 font-semibold">
          Next Unit <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderHistoryStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={goToFloors}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
      <div>
        <h2 className="text-xl font-bold">Past {WINDOW_DAYS} Days</h2>
        <p className="text-sm text-gray-500">
          {recentReadings.length} reading
          {recentReadings.length === 1 ? "" : "s"}
        </p>
      </div>
      {recentReadings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-500">
            No readings recorded
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recentReadings.map((r) => {
            const readingTime = new Date(
              r.reading_time ?? r.timestamp
            ).toLocaleString();
            const ageTimestamp = r.timestamp ?? r.reading_time;
            const kplcValue = r.kplc_reading ?? r.kplc;
            const waterValue = r.water_reading ?? r.water;

            return (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{r.unit_name}</p>
                      <p className="text-xs text-gray-500">
                        Level {r.level} · {readingTime}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <UserIcon className="h-3 w-3" /> {r.reader_name}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {timeAgo(ageTimestamp)}
                    </Badge>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs">
                    {kplcValue != null && (
                      <span className="flex items-center gap-1 font-mono">
                        ⚡ {kplcValue}
                      </span>
                    )}
                    {waterValue != null && (
                      <span className="flex items-center gap-1 font-mono">
                        💧 {waterValue}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-600 text-white sticky top-0 z-10 shadow">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            <div>
              <h1 className="text-sm font-bold">Meter Reader Portal</h1>
              <p className="text-xs opacity-80">
                {user?.name} · ID {user?.id}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-white/10 h-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {sessionCount > 0 && step !== "success" && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-2xl mx-auto px-4 py-2 text-xs flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-medium">
              {sessionCount} reading{sessionCount > 1 ? "s" : ""} submitted
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 pb-8">
        {loading && (
          <p className="text-center py-8 text-gray-500">Loading...</p>
        )}
        {!loading && step === "floor" && renderFloorStep()}
        {!loading && step === "unit" && renderUnitStep()}
        {!loading && step === "form" && renderFormStep()}
        {!loading && step === "success" && renderSuccessStep()}
        {!loading && step === "history" && renderHistoryStep()}
      </main>
    </div>
  );
}