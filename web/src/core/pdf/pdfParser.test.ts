import { describe, expect, it, vi } from "vitest";
import { parsePDF } from "./pdfParser";

describe("pdfParser", () => {
    describe("parsePDF", () => {
        it("parsePDF関数が存在する", () => {
            expect(parsePDF).toBeDefined();
            expect(typeof parsePDF).toBe("function");
        });

        it("Fileオブジェクトを受け取りPromiseを返す", () => {
            const file = new File([""], "test.pdf", { type: "application/pdf" });
            const result = parsePDF(file);
            expect(result).toBeInstanceOf(Promise);
        });

        it("結果オブジェクトが正しい構造を持つ", async () => {
            // PDF.jsをモック
            vi.mock("pdfjs-dist", () => ({
                GlobalWorkerOptions: { workerSrc: "" },
                getDocument: vi.fn(() => ({
                    promise: Promise.reject(new Error("Mock error")),
                })),
                version: "3.0.0",
            }));

            const file = new File([""], "test.pdf", { type: "application/pdf" });
            const result = await parsePDF(file);

            // 結果の構造を確認
            expect(result).toHaveProperty("schedule");
            expect(result).toHaveProperty("scheduleStamp");
            expect(Array.isArray(result.schedule)).toBe(true);
            expect(Array.isArray(result.scheduleStamp)).toBe(true);
        });
    });
});
