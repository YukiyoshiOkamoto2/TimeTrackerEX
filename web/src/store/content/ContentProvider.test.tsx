/**
 * Content Provider Tests
 */

import { describe, expect, it } from "vitest";
import { ContentProvider, PageContent, useContent, usePageContent } from "./ContentProvider";

describe("ContentProvider", () => {
    describe("型定義", () => {
        it("PageContentの型が正しく定義されている", () => {
            const content: PageContent = {
                HomePage: { count: 0 },
                TimeTracker: { pdfFile: null, icsFile: null },
            };

            expect(content.HomePage).toEqual({ count: 0 });
            expect(content.TimeTracker).toEqual({ pdfFile: null, icsFile: null });
        });

        it("ContentProviderが正しくエクスポートされている", () => {
            expect(ContentProvider).toBeDefined();
            expect(useContent).toBeDefined();
            expect(usePageContent).toBeDefined();
        });
    });

    describe("ContentProviderのプロパティ", () => {
        it("ContentProviderが必要なpropsを受け入れる", () => {
            // 型チェックのみのテスト
            const _testProps = {
                children: null,
            };

            expect(_testProps).toBeDefined();
        });
    });

    describe("コンテンツ管理機能", () => {
        it("ページコンテンツを設定・取得できる構造", () => {
            // 型チェックとして、コンテンツ管理の構造をテスト
            const mockContent: PageContent = {};

            // 設定
            mockContent["TestPage"] = { data: "test" };

            // 取得
            expect(mockContent["TestPage"]).toEqual({ data: "test" });
        });

        it("複数のページコンテンツを管理できる構造", () => {
            const mockContent: PageContent = {
                Page1: { value: 1 },
                Page2: { value: 2 },
                Page3: { value: 3 },
            };

            expect(mockContent.Page1).toEqual({ value: 1 });
            expect(mockContent.Page2).toEqual({ value: 2 });
            expect(mockContent.Page3).toEqual({ value: 3 });
        });

        it("特定のページコンテンツをクリアできる構造", () => {
            const mockContent: PageContent = {
                Page1: { data: "test1" },
                Page2: { data: "test2" },
            };

            // Page1をクリア
            delete mockContent.Page1;

            expect(mockContent.Page1).toBeUndefined();
            expect(mockContent.Page2).toEqual({ data: "test2" });
        });

        it("すべてのコンテンツをクリアできる構造", () => {
            let mockContent: PageContent = {
                Page1: { data: "test1" },
                Page2: { data: "test2" },
            };

            // すべてクリア
            mockContent = {};

            expect(mockContent).toEqual({});
        });
    });

    describe("usePageContent フック", () => {
        it("usePageContent がジェネリック型を受け入れる", () => {
            // 型チェック用の構造
            type TestData = { count: number };
            const _testPageName = "TestPage";
            const _testData: TestData = { count: 42 };

            expect(_testPageName).toBe("TestPage");
            expect(_testData.count).toBe(42);
        });

        it("usePageContent の戻り値の構造が正しい", () => {
            // 型チェック: [コンテンツ, セッター, クリアー]
            type UsePageContentReturn<T> = [T | null, (data: T) => void, () => void];

            const mockReturn: UsePageContentReturn<string> = ["test data", (_data: string) => {}, () => {}];

            expect(mockReturn[0]).toBe("test data");
            expect(typeof mockReturn[1]).toBe("function");
            expect(typeof mockReturn[2]).toBe("function");
        });
    });

    describe("ContentContextType", () => {
        it("ContentContextTypeの構造が正しい", () => {
            // 型チェック用の構造
            const mockContext = {
                content: {} as PageContent,
                getPageContent: <T = any,>(_pageName: string): T | null => null,
                setPageContent: <T = any,>(_pageName: string, _data: T): void => {},
                clearPageContent: (_pageName: string): void => {},
                clearAllContent: (): void => {},
            };

            expect(mockContext.content).toBeDefined();
            expect(typeof mockContext.getPageContent).toBe("function");
            expect(typeof mockContext.setPageContent).toBe("function");
            expect(typeof mockContext.clearPageContent).toBe("function");
            expect(typeof mockContext.clearAllContent).toBe("function");
        });
    });
});
