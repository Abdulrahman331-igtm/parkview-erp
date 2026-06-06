// const BASE_URL = import.meta.env.VITE_BASE_URL;

const BASE_URL = "http://127.0.0.1:8000/api/v1";

export const api = {
  async fetchFloorsAndUnits() {
    try {
      const res = await fetch(`${BASE_URL}/units/grouped`);
      if (!res.ok) throw new Error("API unavailable");
      return res.json();
    } catch {
      console.log("Failed to fetch units")
    }
  },

  async submitReading(data) {
    try {
      const readerId = parseInt(data.reader_id, 10) || 1;
      const unitId = parseInt(data.unit_id, 10);

      if (isNaN(unitId)) {
        throw new Error("Invalid unit ID")
      }

      const payload = {
        unit_id: unitId,
        reader_id: readerId,
        kplc_reading: data.kplc != null ? parseFloat(data.kplc) : 0.0,
        water_reading: data.water != null ? parseFloat(data.water) : 0.0,
      };

      const res = await fetch(`${BASE_URL}/readings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok){
        const error = await res.json();
        console.error("API error:", error);
        throw new Error(error.detail || "Failed to save reading");        
      } 
      return res.json();
    } catch(err) {
      console.error("Submission failed, check FastAPI server connection or payload: ", err);
      throw err;
    }
  },

  async fetchRecentReadings() {
    try {
      const res = await fetch(`${BASE_URL}/readings/recent`);
      if (!res.ok) throw new Error("API unavailable");
      return res.json();
    } catch(err) {
      console.error("Failed to retrieve recent data:", err)
    }
  },
};