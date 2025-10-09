import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionButtonContainer, SectionTitle, ViewHeader, ViewSection } from "./ViewLayout";

describe("ViewLayout", () => {
    describe("ViewHeader", () => {
        it("左側のコンテンツのみをレンダリング", () => {
            render(<ViewHeader left={<div>Left Content</div>} />);
            expect(screen.getByText("Left Content")).toBeDefined();
        });

        it("左右両方のコンテンツをレンダリング", () => {
            render(<ViewHeader left={<div>Left Content</div>} right={<div>Right Content</div>} />);
            expect(screen.getByText("Left Content")).toBeDefined();
            expect(screen.getByText("Right Content")).toBeDefined();
        });
    });

    describe("ViewSection", () => {
        it("子要素をレンダリング", () => {
            render(
                <ViewSection>
                    <div>Section Content</div>
                </ViewSection>,
            );
            expect(screen.getByText("Section Content")).toBeDefined();
        });
    });

    describe("SectionTitle", () => {
        it("テキストのみをレンダリング", () => {
            render(<SectionTitle>Title Text</SectionTitle>);
            expect(screen.getByText("Title Text")).toBeDefined();
        });

        it("アイコンとテキストをレンダリング", () => {
            render(<SectionTitle icon={<span data-testid="icon">📄</span>}>Title Text</SectionTitle>);
            expect(screen.getByTestId("icon")).toBeDefined();
            expect(screen.getByText("Title Text")).toBeDefined();
        });
    });

    describe("ActionButtonContainer", () => {
        it("子要素をレンダリング", () => {
            render(
                <ActionButtonContainer>
                    <button>Action</button>
                </ActionButtonContainer>,
            );
            expect(screen.getByText("Action")).toBeDefined();
        });
    });
});
