import { mockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({ __esModule: true, default: mockClient }));

import { createPrescription } from "../prescriptions";
import { uploadLabReport } from "../labReports";

// Two entry points, deliberately, and the difference is invisible on screen:
// uploading from the family member page starts a new visit, uploading from
// inside a visit adds to it. Posting to the wrong one either scatters a visit
// across several sessions or attaches a report to a visit it does not belong to.

const EXTRACTION = { prescription_id: 5, health_session_id: 9, extracted_data: {} };

describe("where a prescription upload is posted", () => {
  beforeEach(() => {
    mockClient.post.mockReset();
    mockClient.post.mockResolvedValue({ data: EXTRACTION });
  });

  it("starts a new visit when there is no session yet", async () => {
    await createPrescription(2, null, "prescriptions/abc.jpg");

    expect(mockClient.post).toHaveBeenCalledWith("/family_members/2/prescriptions", {
      image_key: "prescriptions/abc.jpg",
    });
  });

  it("adds to the visit it was given", async () => {
    await createPrescription(2, 9, "prescriptions/abc.jpg");

    expect(mockClient.post).toHaveBeenCalledWith(
      "/family_members/2/health_sessions/9/prescriptions",
      { image_key: "prescriptions/abc.jpg" }
    );
  });

  it("returns the visit the server put it in", async () => {
    // The screen navigates with this, not with the route param — which is null
    // when the upload began from the family member page.
    const result = await createPrescription(2, null, "prescriptions/abc.jpg");

    expect(result.health_session_id).toBe(9);
  });
});

describe("where a lab report upload is posted", () => {
  beforeEach(() => {
    mockClient.post.mockReset();
    mockClient.post.mockResolvedValue({
      data: { lab_report_id: 4, health_session_id: 9, images_uploaded: 1, status: "pending" },
    });
  });

  it("starts a new visit when there is no session yet", async () => {
    await uploadLabReport(2, null, [ "file:///report.jpg" ]);

    expect(mockClient.post.mock.calls[0][0]).toBe("/family_members/2/lab_reports");
  });

  it("adds to the visit it was given", async () => {
    await uploadLabReport(2, 9, [ "file:///report.jpg" ]);

    expect(mockClient.post.mock.calls[0][0]).toBe(
      "/family_members/2/health_sessions/9/lab_reports"
    );
  });

  it("returns the visit the server put it in", async () => {
    const result = await uploadLabReport(2, null, [ "file:///report.jpg" ]);

    expect(result.health_session_id).toBe(9);
  });
});
