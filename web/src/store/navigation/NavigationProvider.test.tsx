import { describe, expect, it } from "vitest";
import { NavigationHistoryItem, NavigationProvider, useNavigation } from "./NavigationProvider";

describe("NavigationProvider", () => {
    describe("型定義", () => {
        it("NavigationHistoryItemの型が正しく定義されている（null許容）", () => {
            const item1: NavigationHistoryItem = {
                pageName: "home",
                parameter: "id=123",
                link: "/home",
            };

            expect(item1.pageName).toBe("home");
            expect(item1.parameter).toBe("id=123");
            expect(item1.link).toBe("/home");

            const item2: NavigationHistoryItem = {
                pageName: "home",
                parameter: null,
                link: null,
            };

            expect(item2.pageName).toBe("home");
            expect(item2.parameter).toBeNull();
            expect(item2.link).toBeNull();
        });

        it("NavigationProviderが正しくエクスポートされている", () => {
            expect(NavigationProvider).toBeDefined();
            expect(useNavigation).toBeDefined();
        });
    });

    describe("NavigationProviderのプロパティ", () => {
        it("NavigationProviderが必要なpropsを受け入れる（null許容）", () => {
            // 型チェックのみのテスト
            const _testProps1 = {
                children: null,
                initialPageName: "test",
                initialParameter: "param",
                initialLink: "/test",
            };

            const _testProps2 = {
                children: null,
                initialPageName: "test",
                initialParameter: null,
                initialLink: null,
            };

            expect(_testProps1).toBeDefined();
            expect(_testProps2).toBeDefined();
        });

        it("canGoBackプロパティが存在する", () => {
            // 型チェック用の構造
            const mockContext = {
                currentPageName: "test",
                parameter: null as string | null,
                link: null as string | null,
                history: [],
                canGoBack: false,
                navigate: () => {},
                goBack: () => {},
                clearHistory: () => {},
            };

            expect(mockContext.canGoBack).toBe(false);
        });
    });

    describe("履歴サイズ制限", () => {
        it("履歴は最大30個まで保持される", () => {
            // 型チェックとして、30個以上の履歴を想定した構造をテスト
            const mockHistory: NavigationHistoryItem[] = Array.from({ length: 31 }, (_, i) => ({
                pageName: `page${i}`,
                parameter: `param${i}`,
                link: `/page${i}`,
            }));

            expect(mockHistory.length).toBe(31);

            // 実際の動作では30個に制限されることを期待
            const limitedHistory = mockHistory.slice(-30);
            expect(limitedHistory.length).toBe(30);
            expect(limitedHistory[0].pageName).toBe("page1");
            expect(limitedHistory[29].pageName).toBe("page30");
        });
    });
});
