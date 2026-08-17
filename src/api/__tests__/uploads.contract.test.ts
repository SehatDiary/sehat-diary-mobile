import { mockClient, resetMockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({
  __esModule: true,
  default: mockClient,
}));

import { uploadImage, createPrescription } from "../prescriptions";

beforeEach(resetMockClient);

// Fixtures: sehat_diary/docs/API_CONTRACT.md § uploads / prescriptions.
// The R2 bucket is private — the server returns a durable key plus a
// short-lived presigned URL, and the key is what must be sent back.
describe("private-bucket upload contract", () => {
  it("returns both the durable key and a presigned preview URL", async () => {
    mockClient.post.mockResolvedValue({
      data: {
        key: "prescriptions/2f9c-uuid.jpeg",
        url: "https://bucket.acct.r2.cloudflarestorage.com/prescriptions/2f9c-uuid.jpeg?X-Amz-Signature=abc",
      },
    });

    const result = await uploadImage("file:///tmp/photo.jpg");

    expect(result.key).toBe("prescriptions/2f9c-uuid.jpeg");
    expect(result.url).toContain("X-Amz-Signature");
  });

  it("sends the key — never the expiring URL — when creating a prescription", async () => {
    mockClient.post.mockResolvedValue({
      data: {
        prescription_id: 5,
        extracted_data: { medicines: [] },
        confidence_counts: { high: 0, medium: 0, low: 0 },
        low_confidence_medicines: [],
        has_warnings: false,
      },
    });

    await createPrescription(1, 2, "prescriptions/2f9c-uuid.jpeg");

    expect(mockClient.post).toHaveBeenCalledWith(
      "/family_members/1/health_sessions/2/prescriptions",
      { image_key: "prescriptions/2f9c-uuid.jpeg" }
    );

    const body = mockClient.post.mock.calls[0][1] as Record<string, string>;
    expect(JSON.stringify(body)).not.toContain("X-Amz-Signature");
  });
});
