import { ScheduleUtils } from "@/types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePDF } from "./pdfParser";

// 環境変数フラグ
const PRINT_PARSED = process.env.PRINT_PARSED === "1";
const ENABLE_HEAVY_TESTS = process.env.ENABLE_HEAVY_TESTS === "1";
// 重い実ファイル依存テスト制御用
const heavyIt = ENABLE_HEAVY_TESTS ? it : it.skip;

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

        heavyIt("実際のPDFファイルを解析できる", async () => {
            // 勤務実績入力（本人用）.pdfを読み込む（ワークスペースルートから）
            const pdfPath = resolve(__dirname, "../../../../勤務実績入力（本人用）.pdf");
            const pdfBuffer = readFileSync(pdfPath);

            // Node.js環境でarrayBufferメソッドを持つFileオブジェクトを作成
            const file = new File([pdfBuffer], "勤務実績入力（本人用）.pdf", { type: "application/pdf" });
            if (!file.arrayBuffer) {
                (file as any).arrayBuffer = async () => {
                    // Bufferを ArrayBuffer に変換
                    const arrayBuffer = new ArrayBuffer(pdfBuffer.length);
                    const view = new Uint8Array(arrayBuffer);
                    for (let i = 0; i < pdfBuffer.length; i++) {
                        view[i] = pdfBuffer[i];
                    }
                    return arrayBuffer;
                };
            }

            const result = await parsePDF(file);
            if (PRINT_PARSED) {
                console.log(result.schedule.map((s) => ScheduleUtils.getText(s)).join("\n"));
            }
            // 結果の構造を確認
            expect(result).toHaveProperty("schedule");
            expect(result).toHaveProperty("scheduleStamp");
            expect(Array.isArray(result.schedule)).toBe(true);
            expect(Array.isArray(result.scheduleStamp)).toBe(true);
            expect(result.schedule.length).toBe(30);
            expect(result.scheduleStamp.length).toBe(30);

            // スケジュールデータが存在することを確認
            const firstSchedule = result.schedule[0];
            expect(firstSchedule).toHaveProperty("start");
            expect(firstSchedule).toHaveProperty("isHoliday");
            expect(firstSchedule).toHaveProperty("isPaidLeave");
            expect(firstSchedule.start).toBeInstanceOf(Date);

            // エラーメッセージがないことを確認（あっても警告として出力）
            if (PRINT_PARSED && result.errorMessage) {
                console.warn("PDFパース警告:", result.errorMessage);
            }
        });
    });
});
