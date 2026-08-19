import { mockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({ __esModule: true, default: mockClient }));

import { getMedicine, stopMedicine, restartMedicine } from "../prescriptions";
import { MedicineDetail } from "../../types";

// Shape pinned against sehat_diary/docs/API_CONTRACT.md. The screen renders
// three different things from drug_reference_status alone, so a server change
// to it would break this silently.
const MEDICINE: MedicineDetail = {
  id: 12,
  name: "SARTEL H 40",
  dosage: "40mg",
  strength: "40mg",
  dose: "1 tablet",
  form: "tablet",
  frequency: "1-0-0",
  timing: "after food",
  duration_days: 90,
  quantity_prescribed: 30,
  instructions_hi: "नाश्ते के बाद 1 गोली",
  instructions_en: "1 tablet after breakfast",
  raw_text: "SARTEL H 40 TABLET 1-0-0 After Meal",
  confidence: "high",
  needs_schedule_input: false,
  dosing_interval: "daily",
  dosing_weekday: null,
  is_active: true,
  stopped_at: null,
  stopped_reason: null,
  start_date: "2026-08-18",
  end_date: "2026-11-16",
  reminder_times: ["08:00"],
  adherence_summary: { window_days: 7, scheduled: 7, taken: 6, missed: 1 },
  drug_reference_status: "ready",
  drug_reference: {
    description: "An angiotensin receptor blocker with a diuretic.",
    usage: "Prescribed for high blood pressure.",
    side_effects: "Dizziness, tiredness.",
    drug_class: "Antihypertensive",
    generic_composition: [
      { name: "Telmisartan", strength: "40mg" },
      { name: "Hydrochlorothiazide", strength: "12.5mg" },
    ],
    hindi: {
      description: "बीपी की दवा।",
      usage: "हाई ब्लड प्रेशर के लिए।",
      side_effects: "चक्कर, थकान।",
    },
    source: "ai",
  },
  doctor_visit: {
    id: 3,
    visit_date: "2026-08-18",
    doctor_name: "Dr. Uttarwar",
    health_session_id: 9,
    family_member_id: 2,
  },
};

describe("fetching one medicine", () => {
  beforeEach(() => {
    mockClient.get.mockReset();
    mockClient.patch.mockReset();
  });

  it("addresses the medicine by id", async () => {
    mockClient.get.mockResolvedValue({ data: { prescribed_medicine: MEDICINE } });

    await getMedicine(12);

    expect(mockClient.get).toHaveBeenCalledWith("/prescribed_medicines/12");
  });

  it("returns the schedule the patient's phone will actually use", async () => {
    mockClient.get.mockResolvedValue({ data: { prescribed_medicine: MEDICINE } });

    const medicine = await getMedicine(12);

    expect(medicine.reminder_times).toEqual(["08:00"]);
    expect(medicine.adherence_summary.taken).toBe(6);
  });

  it("carries both languages of the drug reference", async () => {
    mockClient.get.mockResolvedValue({ data: { prescribed_medicine: MEDICINE } });

    const medicine = await getMedicine(12);

    expect(medicine.drug_reference_status).toBe("ready");
    expect(medicine.drug_reference?.side_effects).toBe("Dizziness, tiredness.");
    expect(medicine.drug_reference?.hindi?.side_effects).toBe("चक्कर, थकान।");
  });

  it("handles a medicine whose lookup found nothing", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        prescribed_medicine: {
          ...MEDICINE,
          drug_reference_status: "unavailable",
          drug_reference: null,
        },
      },
    });

    const medicine = await getMedicine(12);

    expect(medicine.drug_reference_status).toBe("unavailable");
    expect(medicine.drug_reference).toBeNull();
  });
});

describe("stopping and restarting", () => {
  beforeEach(() => {
    mockClient.patch.mockReset();
  });

  it("stops through the deactivate endpoint", async () => {
    mockClient.patch.mockResolvedValue({
      data: { prescribed_medicine: { ...MEDICINE, is_active: false } },
    });

    const medicine = await stopMedicine(12);

    expect(mockClient.patch).toHaveBeenCalledWith(
      "/prescribed_medicines/12/deactivate",
      {}
    );
    expect(medicine.is_active).toBe(false);
  });

  it("passes a reason when one is given", async () => {
    mockClient.patch.mockResolvedValue({ data: { prescribed_medicine: MEDICINE } });

    await stopMedicine(12, "doctor stopped it");

    expect(mockClient.patch).toHaveBeenCalledWith(
      "/prescribed_medicines/12/deactivate",
      { reason: "doctor stopped it" }
    );
  });

  it("restarts through the reactivate endpoint", async () => {
    mockClient.patch.mockResolvedValue({ data: { prescribed_medicine: MEDICINE } });

    await restartMedicine(12);

    expect(mockClient.patch).toHaveBeenCalledWith("/prescribed_medicines/12/reactivate");
  });
});
